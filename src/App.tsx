import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import { RequireAdmin, RequireAuth } from './components/RequireAuth'
import Home from './pages/Home'
import Login from './pages/Login'
import { ForgotPassword, ResetPassword } from './pages/AuthRecovery'
import LocationDetail from './pages/LocationDetail'
import SubmitLocation from './pages/SubmitLocation'
import EditLocation from './pages/EditLocation'
import Favorites from './pages/Favorites'
import Profile from './pages/Profile'
import Admin from './pages/Admin'
import ModerationSessions from './pages/ModerationSessions'
import { About, Contact, Legal } from './pages/StaticPages'

export default function App(){
  return <Routes><Route element={<Layout/>}>
    <Route path="/" element={<Home/>}/>
    <Route path="/login" element={<Login/>}/>
    <Route path="/forgot-password" element={<ForgotPassword/>}/>
    <Route path="/reset-password" element={<ResetPassword/>}/>
    <Route path="/location/:slug/edit" element={<RequireAuth><EditLocation/></RequireAuth>}/>
    <Route path="/location/:slug" element={<LocationDetail/>}/>
    <Route path="/about" element={<About/>}/>
    <Route path="/contact" element={<Contact/>}/>
    <Route path="/legal/:page" element={<Legal/>}/>
    <Route path="/submit" element={<RequireAuth><SubmitLocation/></RequireAuth>}/>
    <Route path="/favorites" element={<RequireAuth><Favorites/></RequireAuth>}/>
    <Route path="/profile" element={<RequireAuth><Profile/></RequireAuth>}/>
    <Route path="/admin" element={<RequireAdmin><Admin/></RequireAdmin>}/>
    <Route path="/admin/sessions" element={<RequireAdmin><ModerationSessions/></RequireAdmin>}/>
    <Route path="*" element={<Navigate to="/" replace/>}/>
  </Route></Routes>
}