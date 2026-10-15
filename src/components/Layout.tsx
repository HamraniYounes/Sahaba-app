import { Link, NavLink, Outlet } from 'react-router-dom'
import { Compass, Heart, PlusCircle, UserRound, LogIn, LogOut, ShieldCheck, CalendarClock, Menu } from 'lucide-react'
import { useState } from 'react'
import { useAuth, hasAdminRole } from '../contexts/AuthContext'
import Seo from './Seo'

export default function Layout() {
  const { user, profile, signOut } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const nav = [
    { to: '/', label: 'Explorer', icon: Compass },
    { to: '/submit', label: 'Proposer un lieu', icon: PlusCircle },
    ...(user ? [{ to: '/favorites', label: 'Favoris', icon: Heart }] : []),
  ]
  return <div className="min-h-screen flex flex-col"><Seo />
    <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-white focus:px-4 focus:py-3 focus:shadow-lg">Aller au contenu principal</a>
    <header className="sticky top-0 z-40 border-b border-emerald-950/10 bg-white/90 backdrop-blur-xl">
      <div className="container-shell flex h-[76px] items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-3 shrink-0">
          <img src="/sahaba-logo.png" alt="Logo Sahaba" className="h-12 w-12 shrink-0 rounded-xl object-contain" />
          <span><span className="block font-display text-2xl font-bold tracking-tight text-sahaba-900">Sahaba</span><span className="hidden text-[10px] uppercase tracking-[.2em] text-slate-500 sm:block">La communauté près de vous</span></span>
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          {nav.map(item => <NavLink key={item.to} to={item.to} end={item.to === '/'} className={({isActive}) => `nav-link ${isActive ? 'nav-link-active' : ''}`}><item.icon size={17}/>{item.label}</NavLink>)}
        </nav>
        <div className="hidden items-center gap-2 sm:flex">
          {user ? <>
            {hasAdminRole(profile?.role) && <><Link className="icon-button" to="/admin" title="Administration"><ShieldCheck size={19}/></Link><Link className="icon-button" to="/admin/sessions" title="Sessions de modération"><CalendarClock size={19}/></Link></>}
            <Link className="nav-link" to="/profile"><UserRound size={17}/>{profile?.display_name || 'Mon profil'}</Link>
            <button className="icon-button" onClick={() => void signOut()} title="Déconnexion"><LogOut size={18}/></button>
          </> : <Link to="/login" className="button-primary"><LogIn size={17}/> Connexion</Link>}
        </div>
        <button className="icon-button md:hidden" onClick={() => setMenuOpen(!menuOpen)} aria-label="Ouvrir le menu"><Menu/></button>
      </div>
      {menuOpen && <div className="container-shell grid gap-1 pb-4 md:hidden">{nav.map(item=><Link key={item.to} to={item.to} onClick={()=>setMenuOpen(false)} className="nav-link"><item.icon size={18}/>{item.label}</Link>)}{user ? <>{hasAdminRole(profile?.role) && <><Link to="/admin" onClick={()=>setMenuOpen(false)} className="nav-link"><ShieldCheck size={18}/> Administration</Link><Link to="/admin/sessions" onClick={()=>setMenuOpen(false)} className="nav-link"><CalendarClock size={18}/> Sessions de modération</Link></>}<Link to="/profile" className="nav-link">Mon profil</Link><button className="nav-link" onClick={()=>void signOut()}>Déconnexion</button></> : <Link to="/login" className="nav-link">Connexion</Link>}</div>}
    </header>
    <main id="main-content" tabIndex={-1} className="flex-1"><Outlet/></main>
    <footer className="mt-16 border-t border-slate-200 bg-white">
      <div className="container-shell grid gap-6 py-9 sm:grid-cols-2 sm:items-center">
        <div><p className="font-display text-xl font-bold text-sahaba-900">Sahaba</p><p className="mt-1 text-sm text-slate-500">Les lieux de votre communauté, réunis au même endroit.</p></div>
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-500 sm:justify-end"><Link to="/about" className="hover:text-sahaba-700">À propos</Link><Link to="/contact" className="hover:text-sahaba-700">Contact</Link><Link to="/legal/terms" className="hover:text-sahaba-700">Conditions</Link><Link to="/legal/privacy" className="hover:text-sahaba-700">Confidentialité</Link></div>
      </div>
    </footer>
    <nav className="mobile-nav md:hidden">{[{to:'/',label:'Explorer',icon:Compass},{to:'/submit',label:'Proposer',icon:PlusCircle},{to:'/favorites',label:'Favoris',icon:Heart},{to:user?'/profile':'/login',label:user?'Profil':'Connexion',icon:UserRound}].map(item=><NavLink key={item.to} to={item.to} end={item.to==='/'} className={({isActive})=>`mobile-nav-item ${isActive?'mobile-nav-active':''}`}><item.icon size={20}/><span>{item.label}</span></NavLink>)}</nav>
  </div>
}