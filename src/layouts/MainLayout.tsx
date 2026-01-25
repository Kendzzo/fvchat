import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Home, MessageCircle, PlusCircle, Swords, User, Plus } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
const navItems = [{
  icon: Home,
  label: "Home",
  path: "/app"
}, {
  icon: MessageCircle,
  label: "Chat",
  path: "/app/chat"
}, {
  icon: PlusCircle,
  label: "Publicar",
  path: "/app/publish",
  isMain: true
}, {
  icon: Swords,
  label: "Desafíos",
  path: "/app/challenges"
}, {
  icon: User,
  label: "Perfil",
  path: "/app/profile"
}];
export default function MainLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  return <div className="min-h-screen bg-background">
      {/* Main Content */}
      <main className="pb-nav">
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <nav className="bottom-nav safe-bottom my-0 py-[2px] rounded">
        <div className="flex items-center justify-around px-2 py-1">
          {navItems.map(item => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return <button key={item.path} onClick={() => navigate(item.path)} className={cn("nav-item relative py-px my-0", isActive && "active")}>
                {item.isMain ? <motion.div whileTap={{
              scale: 0.9
            }} className="relative -mt-6 rounded-full p-3 bg-gradient-to-r from-primary to-secondary shadow-neon-purple">
                    <Plus className="text-foreground w-[35px] h-[35px]" />
                    {isActive && <motion.div layoutId="nav-glow" className="absolute inset-0 rounded-full bg-secondary/30 blur-xl" initial={false} transition={{
                type: "spring",
                stiffness: 350,
                damping: 30
              }} />}
                  </motion.div> : <>
                    <motion.div whileTap={{
                scale: 0.9
              }} className="nav-icon">
                      <Icon className={cn("w-6 h-6 transition-colors", isActive ? "text-secondary" : "text-muted-foreground")} />
                    </motion.div>
                    <span className={cn("text-xs mt-1 transition-colors", isActive ? "text-secondary font-medium" : "text-muted-foreground")}>
                      {item.label}
                    </span>
                    {isActive && <motion.div layoutId="nav-indicator" className="absolute -bottom-1 w-1 h-1 rounded-full bg-secondary" initial={false} transition={{
                type: "spring",
                stiffness: 350,
                damping: 30
              }} />}
                  </>}
              </button>;
        })}
        </div>
      </nav>
    </div>;
}