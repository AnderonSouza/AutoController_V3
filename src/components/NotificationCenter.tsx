import React, { useState, useEffect } from 'react';
import { Notification, User } from '../types';
import { getNotifications, markNotificationAsRead, createNotification } from '../utils/db';
import StyledSelect from './StyledSelect';

interface NotificationCenterProps {
    isOpen: boolean;
    onClose: () => void;
    user: User | null; 
    users: User[]; 
    onNotificationAction?: (type: string, payload: any) => void;
    initialViewMode?: 'list' | 'create'; 
    onNotificationRead?: (amount: number) => void;
}

const NotificationItem: React.FC<{
    notification: Notification;
    onRead: (id: string) => void;
    onAction?: (type: string, payload: any) => void;
}> = ({ notification, onRead, onAction }) => {
    const isBudgetAction = notification.type === 'BUDGET_ACTION';
    const isTicketUpdate = notification.type === 'TICKET_UPDATE';
    
    const handleAction = () => {
        if (!notification.isRead) onRead(notification.id);
        if (onAction) {
            onAction(notification.type, notification.payload);
        }
    };

    return (
        <div className={`p-4 border-b border-slate-100 hover:bg-slate-50 transition-colors relative group ${!notification.isRead ? 'bg-blue-50/30 border-l-4 border-l-primary' : 'border-l-4 border-l-transparent'}`}>
            <div className="pl-2">
                <div className="flex justify-between items-start mb-1">
                    <h4 className={`text-sm ${!notification.isRead ? 'font-bold text-slate-800' : 'font-medium text-slate-600'}`}>
                        {notification.title}
                    </h4>
                    <span className="text-[10px] text-slate-400 whitespace-nowrap ml-2">
                        {new Date(notification.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                    </span>
                </div>
                
                <p className="text-xs text-slate-500 mb-3 line-clamp-2 leading-relaxed">
                    {notification.content}
                </p>

                <div className="flex gap-2">
                    {isBudgetAction && (
                        <button 
                            onClick={handleAction}
                            className="text-[10px] bg-primary text-white px-3 py-1.5 rounded-lg hover:opacity-90 font-bold flex items-center gap-1 shadow-sm"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                            Preencher Orçamento
                        </button>
                    )}

                    {isTicketUpdate && (
                        <button 
                            onClick={handleAction}
                            className="text-[10px] bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 font-bold flex items-center gap-1 shadow-sm"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                            Ver Chamado
                        </button>
                    )}
                    
                    {!isBudgetAction && !isTicketUpdate && notification.actionLink && (
                        <button onClick={handleAction} className="text-[10px] text-primary hover:underline font-bold">Ver Detalhes</button>
                    )}
                </div>

                {!notification.isRead && (
                    <button 
                        onClick={(e) => { e.stopPropagation(); onRead(notification.id); }}
                        className="absolute top-2 right-2 p-1 text-slate-300 hover:text-primary opacity-0 group-hover:opacity-100 transition-all"
                        title="Marcar como lida"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                    </button>
                )}
            </div>
        </div>
    );
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({ isOpen, onClose, user, users, onNotificationAction, initialViewMode = 'list', onNotificationRead }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [filter, setFilter] = useState<'all' | 'unread'>('all');
    const [isLoading, setIsLoading] = useState(false);
    const [viewMode, setViewMode] = useState<'list' | 'create'>('list');

    const [recipientId, setRecipientId] = useState<string>('');
    const [type, setType] = useState<'SYSTEM_INFO' | 'BUDGET_ACTION'>('SYSTEM_INFO');
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [isSending, setIsSending] = useState(false);

    const fetchNotifications = async () => {
        if (!user) return;
        setIsLoading(true);
        const data = await getNotifications(user.id, 50);
        setNotifications(data);
        setIsLoading(false);
    };

    useEffect(() => {
        if (isOpen) {
            fetchNotifications();
            setViewMode(initialViewMode); 
        }
    }, [isOpen, user?.id, initialViewMode]);

    const handleMarkAsRead = async (id: string) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
        await markNotificationAsRead(id);
        if (onNotificationRead) onNotificationRead(1);
    };

    const handleMarkAllRead = async () => {
        const unreadIds = notifications.filter(n => !n.isRead).map(n => n.id);
        if (unreadIds.length === 0) return;
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        await Promise.all(unreadIds.map(id => markNotificationAsRead(id)));
        if (onNotificationRead) onNotificationRead(unreadIds.length);
    };

    const handleSendNotification = async () => {
        if (!recipientId || !title || !content || !user) return alert("Preencha todos os campos.");
        setIsSending(true);
        try {
            await createNotification({ recipientId, senderId: user.id, type, title, content, payload: {}, isRead: false });
            alert("Enviada!");
            setViewMode('list');
            setTitle(''); setContent(''); setRecipientId('');
        } catch (error) { alert("Erro ao enviar."); } finally { setIsSending(false); }
    };

    const filteredNotifications = filter === 'all' ? notifications : notifications.filter(n => !n.isRead);

    return (
        <>
            <div className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={onClose} />
            <div className={`fixed inset-y-0 right-0 z-[110] w-full sm:w-[450px] bg-white shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/80">
                    <div><h2 className="text-lg font-bold text-slate-800">{viewMode === 'list' ? 'Notificações' : 'Nova Atividade'}</h2><p className="text-xs text-slate-500 mt-0.5">{viewMode === 'list' ? 'Acompanhe chamados e alertas.' : 'Despache uma tarefa.'}</p></div>
                    <div className="flex items-center gap-2">
                        {viewMode === 'list' && (user?.role === 'Administrador' || user?.role === 'Gestor') && (
                            <button onClick={() => setViewMode('create')} className="bg-primary text-white px-3 py-1.5 rounded-lg text-[10px] font-bold shadow-sm hover:opacity-90 flex items-center gap-1.5"><svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>Novo</button>
                        )}
                        <button onClick={onClose} className="text-slate-400 hover:bg-slate-100 p-2 rounded-full transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                    </div>
                </div>

                {viewMode === 'list' ? (
                    <>
                        <div className="px-6 py-3 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
                            <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg">
                                <button onClick={() => setFilter('all')} className={`px-4 py-1 text-[10px] font-bold rounded-md transition-all ${filter === 'all' ? 'bg-white text-primary shadow-sm' : 'text-slate-500'}`}>Todas</button>
                                <button onClick={() => setFilter('unread')} className={`px-4 py-1 text-[10px] font-bold rounded-md transition-all ${filter === 'unread' ? 'bg-white text-primary shadow-sm' : 'text-slate-500'}`}>Não Lidas</button>
                            </div>
                            <button onClick={handleMarkAllRead} className="text-[10px] text-slate-400 hover:text-primary font-bold uppercase transition-colors">Marcar tudo como lido</button>
                        </div>
                        <div className="flex-grow overflow-y-auto bg-white custom-scrollbar">
                            {isLoading ? <div className="flex justify-center py-10 animate-pulse text-slate-300">Carregando...</div> : filteredNotifications.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-64 text-slate-300"><svg className="h-12 w-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg><p className="text-sm font-bold">Nenhuma notificação</p></div>
                            ) : filteredNotifications.map(n => <NotificationItem key={n.id} notification={n} onRead={handleMarkAsRead} onAction={onNotificationAction} />)}
                        </div>
                    </>
                ) : (
                    <div className="flex-grow p-6 space-y-5 bg-slate-50">
                        <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Destinatário</label><StyledSelect value={recipientId} onChange={(e) => setRecipientId(e.target.value)} containerClassName="w-full"><option value="">Selecione...</option>{users.filter(u => u.id !== user?.id).map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}</StyledSelect></div>
                        <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Título</label><input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm" /></div>
                        <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Mensagem</label><textarea value={content} onChange={e => setContent(e.target.value)} rows={5} className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm resize-none" /></div>
                        <div className="pt-4 flex gap-3"><button onClick={() => setViewMode('list')} className="flex-1 py-2.5 border rounded-lg text-xs font-bold text-slate-600">Voltar</button><button onClick={handleSendNotification} disabled={isSending} className="flex-1 py-2.5 bg-primary text-white rounded-lg text-xs font-bold shadow-md">{isSending ? '...' : 'Enviar'}</button></div>
                    </div>
                )}
            </div>
        </>
    );
};

export default NotificationCenter;
