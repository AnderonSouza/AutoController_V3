import React, { useState, useEffect, useRef } from 'react';
import { User, Ticket, TicketMessage, TicketStatus, TicketPriority, TicketDepartment } from '../types';
import { getCadastro, getTicketMessages, createTicket, sendMessage, updateTicketStatus, archiveTicket, createNotification, uploadTicketAttachment } from '../utils/db';
import StyledSelect from './StyledSelect';
import { generateUUID } from '../utils/helpers';

interface SupportViewProps {
    user: User;
    users?: User[];
    initialTicketId?: string | null;
    defaultDepartment?: TicketDepartment | null;
}

const statusColors: Record<TicketStatus, string> = {
    open: 'bg-green-100 text-green-700',
    in_progress: 'bg-blue-100 text-blue-700',
    resolved: 'bg-purple-100 text-purple-700',
    closed: 'bg-slate-100 text-slate-600'
};

const statusLabels: Record<TicketStatus, string> = {
    open: 'Aberto',
    in_progress: 'Em atendimento',
    resolved: 'Resolvido',
    closed: 'Fechado'
};

const SupportView: React.FC<SupportViewProps> = ({ user, users = [], initialTicketId, defaultDepartment }) => {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
    const [messages, setMessages] = useState<TicketMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
    const [newMessage, setNewMessage] = useState('');
    
    // File Upload State
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const [viewFilter, setViewFilter] = useState<'queue' | 'mine' | 'history'>('queue'); 
    const [userTicketFilter, setUserTicketFilter] = useState<'active' | 'history'>('active');
    const [showArchived, setShowArchived] = useState(false);

    // New Ticket Modal
    const [isNewTicketOpen, setIsNewTicketOpen] = useState(false);
    const [newTicketTitle, setNewTicketTitle] = useState('');
    const [newTicketDept, setNewTicketDept] = useState<TicketDepartment>('IT');
    const [newTicketDesc, setNewTicketDesc] = useState('');

    const isAdmin = user.role === 'Administrador';
    const isSupportRole = user.role === 'Suporte';
    const isAgent = isAdmin || isSupportRole;

    const theme = {
        primary: 'bg-primary',
        primaryHover: 'hover:bg-primary-hover',
        lightBg: 'bg-primary-50',
        borderColor: 'border-slate-200',
        textColor: 'text-slate-800',
        subText: 'text-primary',
        headerTitle: defaultDepartment === 'IT' ? 'Suporte Técnico (TI)' : defaultDepartment === 'CONTROLLERSHIP' ? 'Falar com o Controller' : 'Central de Suporte',
        buttonLabel: 'Novo chamado',
        emptyIconColor: 'text-slate-200',
        tabActive: 'bg-primary-50 text-primary'
    };

    useEffect(() => {
        loadTickets();
        if (isAgent) setViewFilter('queue');
    }, [user.id, user.role]);

    useEffect(() => {
        if (initialTicketId && tickets.length > 0) {
            const ticket = tickets.find(t => t.id === initialTicketId);
            if (ticket) {
                setActiveTicket(ticket);
                if (ticket.isArchived) setShowArchived(true);

                if (isAgent) {
                    if (ticket.assignedTo === user.id) setViewFilter('mine');
                    else if (ticket.status === 'closed') setViewFilter('history');
                    else setViewFilter('queue');
                } else {
                    if (ticket.status === 'closed' || ticket.status === 'resolved') setUserTicketFilter('history');
                    else setUserTicketFilter('active');
                }
            }
        }
    }, [initialTicketId, tickets]);

    useEffect(() => {
        if (activeTicket) { loadMessages(activeTicket.id); setSelectedFiles([]); } 
        else { setMessages([]); }
    }, [activeTicket]);

    useEffect(() => { if (defaultDepartment) setNewTicketDept(defaultDepartment); }, [defaultDepartment]);

    const loadTickets = async () => {
        setIsLoading(true);
        try {
            const allTickets = await getCadastro<Ticket>('tickets');
            setTickets(allTickets.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
        } catch (e) { console.error(e); } finally { setIsLoading(false); }
    };

    const loadMessages = async (ticketId: string) => {
        setIsLoadingMessages(true);
        try {
            const msgs = await getTicketMessages(ticketId);
            setMessages(msgs);
        } catch (e) { console.error(e); } finally { setIsLoadingMessages(false); }
    };

    const handleCreateTicket = async () => {
        if (!newTicketTitle.trim() || !newTicketDesc.trim()) return alert("Preencha título e descrição.");
        
        setIsLoading(true);
        try {
            const ticket: Partial<Ticket> = {
                userId: user.id,
                userName: user.name,
                department: newTicketDept, 
                title: newTicketTitle,
                status: 'open',
                priority: 'medium',
                isArchived: false
            };
            
            const created = await createTicket(ticket);
            if (created) {
                await sendMessage({
                    ticketId: created.id, userId: user.id, userName: user.name, content: newTicketDesc
                });
                
                const agentsToNotify = users.filter(u => 
                    (u.role === 'Administrador' || (u.role === 'Suporte' && u.supportDepartment === newTicketDept)) && 
                    u.id !== user.id
                );

                await Promise.all(agentsToNotify.map(agent => 
                    createNotification({
                        recipientId: agent.id,
                        senderId: user.id,
                        type: 'TICKET_UPDATE',
                        title: `🆕 Novo Chamado: ${newTicketTitle}`,
                        content: `${user.name} abriu um chamado em ${newTicketDept === 'IT' ? 'TI' : 'Controladoria'}.`,
                        payload: { ticketId: created.id },
                        isRead: false
                    })
                ));

                setIsNewTicketOpen(false);
                setNewTicketTitle('');
                setNewTicketDesc('');
                loadTickets();
                setActiveTicket(created);
                setUserTicketFilter('active'); 
            }
        } catch (e: any) {
            alert(`Erro: ${e.message}`);
        } finally { setIsLoading(false); }
    };

    const handleSendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if ((!newMessage.trim() && selectedFiles.length === 0) || !activeTicket) return;
        
        const content = newMessage;
        const filesToUpload = [...selectedFiles];
        setNewMessage('');
        setSelectedFiles([]);
        setIsUploading(true);

        try {
            let uploadedUrls: string[] = [];
            if (filesToUpload.length > 0) {
                const uploadPromises = filesToUpload.map(file => uploadTicketAttachment(file));
                uploadedUrls = await Promise.all(uploadPromises);
            }

            const sent = await sendMessage({
                ticketId: activeTicket.id, userId: user.id, userName: user.name, content: content, attachments: uploadedUrls
            });
            
            if (sent) {
                setMessages(prev => [...prev, sent]);
                
                if (isAgent) {
                    await createNotification({
                        recipientId: activeTicket.userId,
                        senderId: user.id,
                        type: 'TICKET_UPDATE',
                        title: `💬 Suporte respondeu ao chamado #${activeTicket.id.slice(0, 8)}`,
                        content: `${user.name}: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`,
                        payload: { ticketId: activeTicket.id },
                        isRead: false
                    });
                } else {
                    if (activeTicket.assignedTo) {
                        await createNotification({
                            recipientId: activeTicket.assignedTo,
                            senderId: user.id,
                            type: 'TICKET_UPDATE',
                            title: `💬 Nova mensagem no chamado #${activeTicket.id.slice(0, 8)}`,
                            content: `${user.name}: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`,
                            payload: { ticketId: activeTicket.id },
                            isRead: false
                        });
                    } else {
                        const agentsToNotify = users.filter(u => 
                            (u.role === 'Administrador' || (u.role === 'Suporte' && u.supportDepartment === activeTicket.department)) && 
                            u.id !== user.id
                        );

                        await Promise.all(agentsToNotify.map(agent => 
                            createNotification({
                                recipientId: agent.id,
                                senderId: user.id,
                                type: 'TICKET_UPDATE',
                                title: `💬 Nova mensagem em chamado aberto #${activeTicket.id.slice(0, 8)}`,
                                content: `${user.name}: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`,
                                payload: { ticketId: activeTicket.id },
                                isRead: false
                            })
                        ));
                    }
                }
            }
        } catch (e) {
            alert("Falha ao enviar mensagem.");
        } finally { setIsUploading(false); }
    };

    const handleStatusChange = async (newStatus: TicketStatus, assignToMe = false) => {
        if (!activeTicket) return;
        setIsUpdatingStatus(true);
        try {
            const assignedTo = assignToMe ? user.id : activeTicket.assignedTo;
            await updateTicketStatus(activeTicket.id, newStatus, assignedTo);
            
            if (activeTicket.userId !== user.id) {
                await createNotification({
                    recipientId: activeTicket.userId,
                    senderId: user.id,
                    type: 'TICKET_UPDATE',
                    title: `🔄 Status Atualizado: ${statusLabels[newStatus]}`,
                    content: `Seu chamado #${activeTicket.id.slice(0, 8)} teve o status alterado pelo suporte.`,
                    payload: { ticketId: activeTicket.id },
                    isRead: false
                });
            }

            const updatedTicket = { ...activeTicket, status: newStatus, assignedTo: assignedTo };
            setActiveTicket(updatedTicket);
            setTickets(prev => prev.map(t => t.id === activeTicket.id ? updatedTicket : t));
        } catch (e: any) {
            alert(`Erro: ${e.message}`);
        } finally { setIsUpdatingStatus(false); }
    };

    const handleArchiveTicket = async () => {
        if (!activeTicket) return;
        try {
            await archiveTicket(activeTicket.id, true);
            const updatedTicket = { ...activeTicket, isArchived: true };
            setActiveTicket(updatedTicket);
            setTickets(prev => prev.map(t => t.id === activeTicket.id ? updatedTicket : t));
        } catch (e) { alert("Erro ao arquivar."); }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setSelectedFiles(Array.from(e.target.files));
        }
    };

    const renderAttachment = (url: string, index: number) => {
        const extension = url.split('.').pop()?.toLowerCase();
        const filename = url.split('/').pop()?.split('_').slice(1).join('_') || 'Anexo'; 
        if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension || '')) {
            return (
                <div key={index} className="mt-2">
                    <a href={url} target="_blank" rel="noopener noreferrer">
                        <img src={url} alt="Anexo" className="max-w-[200px] max-h-[200px] rounded-lg border border-slate-200 hover:opacity-90 transition-opacity" />
                    </a>
                </div>
            );
        }
        return (
            <div key={index} className="mt-2">
                <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 bg-slate-50 w-fit text-xs text-blue-600 hover:underline font-medium">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                    {filename}
                </a>
            </div>
        );
    };

    const displayedTickets = tickets.filter(t => {
        if (isSupportRole && user.supportDepartment && t.department !== user.supportDepartment) return false;
        if (defaultDepartment && t.department !== defaultDepartment) return false;
        
        if (t.isArchived && !showArchived) return false;
        
        if (!isAgent) {
            if (t.userId !== user.id) return false;
            const isResolved = t.status === 'resolved' || t.status === 'closed';
            return userTicketFilter === 'active' ? !isResolved : isResolved;
        }
        if (viewFilter === 'queue') return (t.status === 'open' || t.status === 'in_progress') && !t.assignedTo && !t.isArchived;
        if (viewFilter === 'mine') return (t.status === 'open' || t.status === 'in_progress') && t.assignedTo === user.id && !t.isArchived;
        if (viewFilter === 'history') return t.status === 'resolved' || t.status === 'closed';
        return false;
    });

    const messagesEndRef = useRef<HTMLDivElement>(null);
    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    return (
        <div className="flex flex-col h-full bg-[#f1f5f9] p-4 lg:p-6 overflow-hidden">
            <div className={`flex-grow flex bg-white rounded-2xl shadow-xl overflow-hidden border ${theme.borderColor}`}>
                <div className="w-80 md:w-96 border-r border-slate-100 flex flex-col h-full shrink-0 bg-white">
                    <div className="p-5 border-b border-slate-100 flex flex-col gap-4">
                        {/* TITLE SIZE INCREASED TO 2XL FOR BETTER EVIDENCE */}
                        <h2 className={`text-2xl font-black ${theme.textColor}`}>{theme.headerTitle}</h2>
                        <button onClick={() => setIsNewTicketOpen(true)} className={`w-full py-3 ${theme.primary} text-white rounded-xl ${theme.primaryHover} shadow-md transition-all font-bold text-sm flex items-center justify-center gap-2 transform active:scale-95`}><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>{theme.buttonLabel}</button>
                        
                        <div className="flex flex-col gap-2">
                            <div className="flex p-1 bg-slate-100 rounded-lg shrink-0">
                                {isAgent ? (
                                    <>{['queue', 'mine', 'history'].map(f => <button key={f} onClick={() => setViewFilter(f as any)} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${viewFilter === f ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>{f === 'queue' ? 'Fila' : f === 'mine' ? 'Meus' : 'Histórico'}</button>)}</>
                                ) : (
                                    <>{['active', 'history'].map(f => <button key={f} onClick={() => setUserTicketFilter(f as any)} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${userTicketFilter === f ? `bg-white shadow-sm font-bold` : 'text-slate-500 hover:text-slate-700'}`}>{f === 'active' ? 'Em Aberto' : 'Histórico'}</button>)}</>
                                )}
                            </div>
                            
                            <button 
                                onClick={() => setShowArchived(!showArchived)}
                                className={`flex items-center justify-between px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border ${showArchived ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'}`}
                            >
                                <span className="flex items-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                                    Exibir Arquivados
                                </span>
                                <div className={`w-6 h-3 rounded-full relative transition-colors ${showArchived ? 'bg-indigo-500' : 'bg-slate-300'}`}>
                                    <div className={`absolute top-0.5 w-2 h-2 rounded-full bg-white transition-all ${showArchived ? 'right-0.5' : 'left-0.5'}`} />
                                </div>
                            </button>
                        </div>
                    </div>
                    <div className="flex-grow overflow-y-auto custom-scrollbar bg-slate-50/30">
                        {displayedTickets.length === 0 ? (
                            <div className="p-8 text-center text-slate-400 text-sm flex flex-col items-center mt-10"><div className={`w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 ${theme.emptyIconColor}`}><svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg></div><p className="font-medium">Nenhum chamado.</p></div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {displayedTickets.map(ticket => (
                                    <div key={ticket.id} onClick={() => setActiveTicket(ticket)} className={`p-4 cursor-pointer hover:bg-white transition-colors border-l-4 ${activeTicket?.id === ticket.id ? `bg-white shadow-sm z-10 border-l-primary` : 'border-l-transparent'} ${ticket.isArchived ? 'bg-slate-100/50' : ''}`}>
                                        <div className="flex justify-between items-start mb-1.5">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${ticket.isArchived ? 'bg-indigo-100 text-indigo-600' : statusColors[ticket.status]}`}>
                                                {ticket.isArchived ? 'Arquivado' : statusLabels[ticket.status]}
                                            </span>
                                            <span className="text-[10px] text-slate-400">{new Date(ticket.updatedAt).toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'})}</span>
                                        </div>
                                        <h3 className={`text-sm font-bold mb-1 line-clamp-1 ${activeTicket?.id === ticket.id ? 'text-slate-900' : 'text-slate-700'}`}>{ticket.title}</h3>
                                        <div className="flex justify-between items-center text-xs text-slate-500"><span className="truncate opacity-80 font-mono text-[10px]">#{ticket.id.slice(0,8)}</span>{isAgent && <span className="truncate max-w-[80px] font-bold bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">{ticket.userName?.split(' ')[0]}</span>}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex-grow flex flex-col h-full bg-[#EFEAE2] relative" style={{ backgroundImage: 'radial-gradient(#d1d5db 0.5px, transparent 0.5px)', backgroundSize: '15px 15px' }}>
                    {activeTicket ? (
                        <>
                            <div className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shadow-sm shrink-0 z-20 h-16">
                                <h1 className="text-sm font-bold text-slate-800 flex items-center gap-2"><span className={`w-2 h-2 rounded-full ${activeTicket.status === 'open' ? 'bg-green-500 animate-pulse' : activeTicket.status === 'closed' ? 'bg-slate-400' : 'bg-blue-500'}`}></span>{activeTicket.title}</h1>
                                <div className="flex gap-2">
                                    {isAgent && (
                                        <>
                                            {activeTicket.status === 'open' && <button onClick={() => handleStatusChange('in_progress', true)} disabled={isUpdatingStatus} className={`px-4 py-1.5 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary-hover transition-colors shadow-sm disabled:opacity-50`}>{isUpdatingStatus ? '...' : 'Assumir'}</button>}
                                            {activeTicket.status === 'in_progress' && <button onClick={() => handleStatusChange('resolved')} disabled={isUpdatingStatus} className="px-4 py-1.5 bg-purple-600 text-white text-xs font-bold rounded-lg hover:bg-purple-700 transition-colors shadow-sm disabled:opacity-50">Resolver</button>}
                                            {activeTicket.status !== 'closed' && <button onClick={() => handleStatusChange('closed')} disabled={isUpdatingStatus} className="px-4 py-1.5 bg-white border border-slate-300 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50">Fechar</button>}
                                        </>
                                    )}
                                    {!isAgent && activeTicket.status === 'resolved' && <button onClick={() => handleStatusChange('closed')} className="px-4 py-1.5 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700 transition-colors shadow-sm">Confirmar solução</button>}
                                    {activeTicket.status === 'closed' && !activeTicket.isArchived && <button onClick={handleArchiveTicket} className="px-4 py-1.5 bg-slate-100 border border-slate-300 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-200 transition-colors flex items-center gap-1"><svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>Arquivar</button>}
                                </div>
                            </div>

                            <div className="flex-grow overflow-y-auto p-4 md:p-6 space-y-4 custom-scrollbar">
                                {messages.map((msg, idx) => {
                                    const isMe = msg.userId === user.id;
                                    return (
                                        <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[85%] md:max-w-[70%] rounded-xl p-3 shadow-sm relative text-sm border ${isMe ? 'bg-[#dcf8c6] border-[#c7edae] text-slate-900 rounded-tr-none' : 'bg-white border-white text-slate-900 rounded-tl-none'}`}>
                                                {!isMe && <div className="text-[11px] font-bold text-primary mb-1 leading-none">{msg.userName}</div>}
                                                <p className="whitespace-pre-wrap leading-relaxed break-words">{msg.content}</p>
                                                {msg.attachments?.map((url, i) => renderAttachment(url, i))}
                                                <div className="text-[10px] text-slate-400 mt-1 text-right select-none">{new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                                            </div>
                                        </div>
                                    );
                                })}
                                <div ref={messagesEndRef} />
                            </div>

                            {activeTicket.status !== 'closed' ? (
                                <div className="bg-[#f0f2f5] px-4 py-3 flex items-center gap-3 border-t border-slate-200 shrink-0">
                                    <input type="file" ref={fileInputRef} multiple className="hidden" onChange={handleFileSelect} />
                                    <button onClick={() => fileInputRef.current?.click()} className="p-2 text-slate-500 hover:text-primary transition-colors rounded-full hover:bg-white shrink-0"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg></button>
                                    <form onSubmit={handleSendMessage} className="flex-grow flex items-center gap-2">
                                        <div className="flex-grow bg-white rounded-xl border border-slate-200 focus-within:ring-2 focus-within:ring-primary/20 transition-all"><input type="text" className="w-full h-11 border-none outline-none bg-transparent px-4 text-sm" placeholder="Digite uma mensagem..." value={newMessage} onChange={e => setNewMessage(e.target.value)} disabled={isUploading} /></div>
                                        <button type="submit" disabled={(!newMessage.trim() && selectedFiles.length === 0) || isUploading} className={`p-2.5 rounded-full bg-primary text-white shadow-md disabled:opacity-50 transform active:scale-95 transition-all`}><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg></button>
                                    </form>
                                </div>
                            ) : <div className="p-4 bg-slate-100 border-t text-center text-slate-500 text-xs font-bold uppercase tracking-widest">Atendimento encerrado</div>}
                        </>
                    ) : <div className="flex flex-col items-center justify-center h-full text-slate-400 opacity-50"><svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg><p className="font-bold text-sm">Selecione uma conversa para visualizar</p></div>}
                </div>
            </div>

            {isNewTicketOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
                        <div className={`p-4 bg-primary text-white`}><h4 className="font-bold">Abrir Novo Chamado</h4><p className="text-xs opacity-90">Descreva sua solicitação com o máximo de detalhes.</p></div>
                        <div className="p-6 space-y-4">
                            <div><label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Assunto</label><input type="text" className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary outline-none" value={newTicketTitle} onChange={e => setNewTicketTitle(e.target.value)} autoFocus /></div>
                            <div><label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Descrição Detalhada</label><textarea rows={5} className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary outline-none resize-none" value={newTicketDesc} onChange={e => setNewTicketDesc(e.target.value)} /></div>
                        </div>
                        <div className="px-6 py-4 border-t bg-slate-50 flex justify-end gap-3"><button onClick={() => setIsNewTicketOpen(false)} className="px-5 py-2 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors">Cancelar</button><button onClick={handleCreateTicket} disabled={isLoading} className={`px-6 py-2.5 bg-primary text-white rounded-lg text-sm font-bold shadow-md transform active:scale-95 disabled:opacity-50`}>{isLoading ? 'Enviando...' : 'Abrir Chamado'}</button></div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SupportView;
