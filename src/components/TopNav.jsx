import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FolderUp } from 'lucide-react';

export default function TopNav() {
    const nav = useNavigate();
    return (
        <nav className="topnav">
            <div className="topnav-brand"><span>Nairobi</span> flood risk</div>
            <div className="topnav-links">
                <NavLink to="/dashboard" className={({ isActive }) => (isActive ? 'active' : '')}>
                    <LayoutDashboard size={15} /> Dashboard
                </NavLink>
                <button className="topnav-btn" onClick={() => nav('/portfolios')}>
                    <FolderUp size={15} /> Portfolios
                </button>
            </div>
        </nav>
    );
}