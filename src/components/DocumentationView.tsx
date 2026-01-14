import React, { useState, useMemo } from 'react';
import { User } from '../types';

// --- DATA DEFINITIONS ---

interface Article {
    id: string;
    title: string;
    description: string;
    category: 'Geral' | 'Administração' | 'Financeiro' | 'Orçamento' | 'Suporte';
    icon: React.ReactNode;
    content: React.ReactNode;
    gradient?: string; // Optional gradient for featured cards
}

const ARTICLES: Article[] = [
    {
        id: 'getting-started',
        title: 'Primeiros Passos',
        description: 'Visão geral do sistema e navegação.',
        category: 'Geral',
        gradient: 'from-indigo-500 to-purple-600',
        icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
        content: (
            <div className="space-y-4 text-slate-600">
                <p>Bem-vindo ao <strong>Sistema de Gestão Financeira</strong>. Esta plataforma centraliza a visão de resultados do grupo.</p>
                <h3 className="text-lg font-bold text-slate-800">Módulos Principais</h3>
                <ul className="list-disc pl-5 space-y-2">
                    <li><strong>Análises:</strong> Visualização de DRE e Fluxo de Caixa.</li>
                    <li><strong>Orçamento:</strong> Planejamento e premissas financeiras.</li>
                    <li><strong>Integração:</strong> Carga de dados via Excel.</li>
                    <li><strong>Suporte:</strong> Canal direto para resolução de problemas.</li>
                </ul>
            </div>
        )
    },
    {
        id: 'tech-support-guide',
        title: 'Como usar o Suporte',
        description: 'Aprenda a abrir chamados e pedir ajuda.',
        category: 'Suporte',
        gradient: 'from-emerald-500 to-teal-600',
        icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" /></svg>,
        content: (
            <div className="space-y-4 text-slate-600">
                <p>O módulo de <strong>Suporte Técnico</strong> é o canal oficial para reportar erros ou tirar dúvidas.</p>
                <h3 className="text-lg font-bold text-slate-800">Passo a Passo</h3>
                <ol className="list-decimal pl-5 space-y-2">
                    <li>No menu lateral, clique em <strong>Suporte Técnico</strong>.</li>
                    <li>Clique no botão <strong>"Novo Chamado"</strong> (ícone de +).</li>
                    <li>Escolha o departamento:
                        <ul className="list-circle pl-5 mt-1 text-sm bg-slate-50 p-2 rounded">
                            <li><strong>TI / Sistemas:</strong> Para erros, acesso ou lentidão.</li>
                            <li><strong>Controladoria:</strong> Para dúvidas sobre números ou relatórios.</li>
                        </ul>
                    </li>
                    <li>Descreva o problema e clique em Abrir.</li>
                </ol>
                <p>Você receberá notificações quando houver uma resposta.</p>
            </div>
        )
    },
    {
        id: 'notifications-guide',
        title: 'Central de Notificações',
        description: 'Entenda seus alertas e tarefas pendentes.',
        category: 'Geral',
        gradient: 'from-blue-500 to-cyan-600',
        icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>,
        content: (
            <div className="space-y-4 text-slate-600">
                <p>A <strong>Central de Notificações</strong> (ícone de sino no topo) mantém você atualizado.</p>
                <h3 className="text-lg font-bold text-slate-800">O que aparece aqui?</h3>
                <ul className="list-disc pl-5 space-y-2">
                    <li>Respostas do suporte técnico aos seus chamados.</li>
                    <li>Solicitações de preenchimento de orçamento enviadas por gestores.</li>
                    <li>Avisos gerais do sistema.</li>
                </ul>
                <div className="bg-blue-50 p-3 rounded border border-blue-200 text-blue-800 text-sm">
                    <strong>Dica:</strong> Se houver uma bolinha vermelha no sino, você tem mensagens não lidas.
                </div>
            </div>
        )
    },
    {
        id: 'data-import',
        title: 'Importação de Dados',
        description: 'Como carregar balancetes contábeis via Excel.',
        category: 'Administração',
        icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>,
        content: (
            <div className="space-y-4 text-slate-600">
                <p>A carga de dados é feita via upload de arquivos Excel (.xlsx).</p>
                <ol className="list-decimal pl-5 space-y-2">
                    <li>Acesse <strong>Integração de Dados &gt; Carregar Realizado</strong>.</li>
                    <li>Clique em "Lançamentos Contábeis" e selecione o arquivo.</li>
                    <li>Mapeie as colunas (Data, Conta, Valor, etc) na tela de importação.</li>
                    <li>Confirme para processar os dados.</li>
                </ol>
            </div>
        )
    },
    {
        id: 'dre-analysis',
        title: 'Análise de DRE',
        description: 'Interpretando o Demonstrativo de Resultados.',
        category: 'Financeiro',
        icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
        content: (
            <div className="space-y-4 text-slate-600">
                <p>O DRE Gerencial permite visualizar a saúde financeira da empresa.</p>
                <ul className="list-disc pl-5 space-y-2">
                    <li>Use os filtros de <strong>Marca, Loja e Período</strong> no topo.</li>
                    <li>Ative <strong>"Detalhes"</strong> para ver ajustes e transferências.</li>
                    <li>Ative <strong>"Análise Vertical"</strong> para ver % sobre a Receita.</li>
                </ul>
            </div>
        )
    },
    {
        id: 'budget-planning',
        title: 'Orçamento',
        description: 'Definição de premissas e input de valores.',
        category: 'Orçamento',
        icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /></svg>,
        content: (
            <div className="space-y-4 text-slate-600">
                <p>O módulo de orçamento permite projetar resultados futuros.</p>
                <ol className="list-decimal pl-5 space-y-2">
                    <li>Defina as <strong>Premissas</strong> (ex: Volume, Ticket Médio).</li>
                    <li>Preencha os valores esperados por loja e mês.</li>
                    <li>Os valores calculados aparecerão automaticamente na coluna "Orçado" do DRE.</li>
                </ol>
            </div>
        )
    }
];

const DocumentationView: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('Todas');
    const [activeArticle, setActiveArticle] = useState<Article | null>(null);

    const categories = ['Todas', 'Geral', 'Suporte', 'Administração', 'Financeiro', 'Orçamento'];

    const featuredArticles = ARTICLES.filter(a => a.gradient);
    const regularArticles = ARTICLES.filter(a => !a.gradient);

    const filteredArticles = useMemo(() => {
        const all = [...featuredArticles, ...regularArticles];
        return all.filter(article => {
            const matchesSearch = article.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                  article.description.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCategory = selectedCategory === 'Todas' || article.category === selectedCategory;
            return matchesSearch && matchesCategory;
        });
    }, [searchTerm, selectedCategory, featuredArticles, regularArticles]);

    return (
        <main className="flex-grow p-6 lg:p-8 overflow-y-auto bg-slate-50/50 h-full flex flex-col">
            <div className="max-w-7xl mx-auto w-full flex flex-col h-full">
                
                {/* Search & Filter Bar */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-8 sticky top-0 z-20">
                    <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                        <div className="relative w-full md:w-96">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                            <input 
                                type="text" 
                                placeholder="O que você quer aprender hoje?" 
                                className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg leading-5 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        
                        <div className="flex gap-2 overflow-x-auto pb-1 w-full md:w-auto">
                            {categories.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setSelectedCategory(cat)}
                                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${selectedCategory === cat ? 'bg-slate-800 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Content Area */}
                <div className="space-y-10 pb-12">
                    
                    {/* Featured Section (Only show if no specific search/filter is active to keep results clean) */}
                    {selectedCategory === 'Todas' && !searchTerm && (
                        <div className="animate-fadeIn">
                            <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <span className="text-2xl">🚀</span> Recomendados para você
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {featuredArticles.map(article => (
                                    <div 
                                        key={article.id}
                                        onClick={() => setActiveArticle(article)}
                                        className={`bg-gradient-to-br ${article.gradient} rounded-xl p-6 text-white cursor-pointer shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all transform duration-200 group`}
                                    >
                                        <div className="bg-white/20 w-12 h-12 rounded-lg flex items-center justify-center mb-4 backdrop-blur-sm group-hover:bg-white/30 transition-colors">
                                            {article.icon}
                                        </div>
                                        <h3 className="text-lg font-bold mb-1">{article.title}</h3>
                                        <p className="text-white/90 text-sm font-medium">{article.description}</p>
                                        <div className="mt-4 pt-3 border-t border-white/20 flex items-center text-xs font-bold uppercase tracking-wider opacity-80 group-hover:opacity-100">
                                            Ler Guia <svg className="w-3 h-3 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7-7" /></svg>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* All Articles Grid */}
                    <div className="animate-fadeIn">
                        <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                           <span className="text-2xl">📚</span> 
                           {searchTerm ? 'Resultados da busca' : 'Todos os tópicos'}
                        </h2>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredArticles.map(article => {
                                // Don't duplicate featured cards in the main list if showing defaults
                                if (selectedCategory === 'Todas' && !searchTerm && article.gradient) return null;

                                return (
                                    <div 
                                        key={article.id}
                                        onClick={() => setActiveArticle(article)}
                                        className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-lg hover:border-primary/30 transition-all cursor-pointer group flex flex-col h-full"
                                    >
                                        <div className="flex items-start justify-between mb-4">
                                            <div className={`p-3 rounded-lg ${article.gradient ? 'bg-slate-100 text-slate-600' : 'bg-slate-50 text-slate-500'} group-hover:bg-primary group-hover:text-white transition-colors`}>
                                                {article.icon}
                                            </div>
                                            <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded tracking-wider group-hover:bg-slate-200 transition-colors">
                                                {article.category}
                                            </span>
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-800 mb-2 group-hover:text-primary transition-colors">
                                            {article.title}
                                        </h3>
                                        <p className="text-sm text-slate-500 leading-relaxed flex-grow">
                                            {article.description}
                                        </p>
                                        <div className="mt-4 pt-4 border-t border-slate-50 flex items-center text-primary text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-2 group-hover:translate-y-0">
                                            Acessar <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {filteredArticles.length === 0 && (
                            <div className="col-span-full py-12 text-center text-slate-400 bg-white rounded-xl border border-slate-200 border-dashed">
                                <p className="text-lg font-medium">Nenhum tópico encontrado.</p>
                                <p className="text-sm mt-1">Tente buscar por outro termo.</p>
                                <button onClick={() => { setSearchTerm(''); setSelectedCategory('Todas'); }} className="mt-4 text-primary font-bold hover:underline">Limpar filtros</button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Article Modal */}
            {activeArticle && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fadeIn" onClick={() => setActiveArticle(null)}>
                    <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transform transition-all scale-100" onClick={e => e.stopPropagation()}>
                        <div className={`px-8 py-6 border-b border-slate-100 flex justify-between items-start shrink-0 ${activeArticle.gradient ? `bg-gradient-to-r ${activeArticle.gradient} text-white` : 'bg-slate-50/50 text-slate-800'}`}>
                            <div>
                                <span className={`text-xs font-bold uppercase tracking-wider mb-2 block ${activeArticle.gradient ? 'text-white/80' : 'text-primary'}`}>{activeArticle.category}</span>
                                <h2 className="text-2xl font-bold">{activeArticle.title}</h2>
                            </div>
                            <button onClick={() => setActiveArticle(null)} className={`p-2 rounded-full transition-colors ${activeArticle.gradient ? 'hover:bg-white/20 text-white' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-600'}`}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="p-8 overflow-y-auto">
                            <div className="prose prose-slate max-w-none prose-headings:font-bold prose-a:text-primary">
                                {activeArticle.content}
                            </div>
                        </div>
                        <div className="px-8 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end shrink-0">
                            <button onClick={() => setActiveArticle(null)} className="px-6 py-2 bg-slate-800 text-white text-sm font-bold rounded-lg hover:bg-slate-900 transition-colors shadow-md">
                                Entendi
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
};

export default DocumentationView;
