import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AjoProvider } from './context/AjoContext'
import Layout from './components/Layout'
import Home from './pages/Home'
import CreateAjo from './pages/CreateAjo'
import Dashboard from './pages/Dashboard'
import GroupDetail from './pages/GroupDetail'
import JoinGroup from './pages/JoinGroup'
import Voting from './pages/Voting'
import Vesting from './pages/Vesting'

export default function App() {
  return (
    <AjoProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/join" element={<JoinGroup />} />
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/create" element={<CreateAjo />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/group/:id" element={<GroupDetail />} />
            <Route path="/voting" element={<Voting />} />
            <Route path="/vesting" element={<Vesting />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AjoProvider>
  )
}