
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import NotificationSystem from "@/components/NotificationSystem";
import {
  Home,
  Calendar,
  Plus,
  Settings,
  Users,
  ClipboardList,
  Shield,
  LogOut,
  User as UserIcon,
  Timer,
  Award,
  Presentation,
  Calculator,
  BarChart3,
  Flag,
  Trophy, // Added Trophy import
  FileText // Added FileText import for System Reports
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { User } from "@/entities/User";
import { Button } from "@/components/ui/button";

const navigationItems = [
  {
    title: "Dashboard",
    url: createPageUrl("Dashboard"),
    icon: Home,
    roles: ["admin", "scrutineer", "team_captain", "inspection_responsible", "team_member", "judge", "marshal", "viewer", "track_marshal", "bp_judge", "cm_judge", "design_judge_software", "design_judge_mechanical", "design_judge_electronics", "design_judge_overall"]
  },
  {
    title: "Results",
    url: createPageUrl("Results"),
    icon: Trophy,
    roles: ["admin", "scrutineer", "team_captain", "team_member", "viewer", "track_marshal", "bp_judge", "cm_judge", "design_judge_software", "design_judge_mechanical", "design_judge_electronics", "design_judge_overall"]
  }
];

const competitionHubs = [
  {
    title: "Scrutineering",
    items: [
      {
        title: "Calendar",
        url: createPageUrl("Calendar"),
        icon: Calendar,
        roles: ["admin", "scrutineer", "team_captain", "team_member"]
      },
      {
        title: "Book Inspection",
        url: createPageUrl("BookInspection"),
        icon: Plus,
        roles: ["admin", "team_captain"]
      },
      {
        title: "Live Inspections",
        url: createPageUrl("LiveInspections"),
        icon: ClipboardList,
        roles: ["admin", "scrutineer"]
      }
    ]
  },
  {
    title: "Track Events",
    items: [
      {
        title: "Track Marshal",
        url: createPageUrl("TrackMarshal"),
        icon: Timer,
        roles: ["admin", "track_marshal"]
      },
      {
        title: "Live Track Data",
        url: createPageUrl("LiveTrackData"),
        icon: BarChart3,
        roles: ["admin", "track_marshal", "team_captain", "team_member", "viewer"]
      }
    ]
  },
  {
    title: "Judged Events",
    items: [
      {
        title: "Design Event",
        url: createPageUrl("DesignEvent"),
        icon: Award,
        roles: ["admin", "design_judge_software", "design_judge_mechanical", "design_judge_electronics", "design_judge_overall"]
      },
      {
        title: "Business Plan",
        url: createPageUrl("BusinessPlan"),
        icon: Presentation,
        roles: ["admin", "bp_judge"]
      },
      {
        title: "Cost & Manufacturing",
        url: createPageUrl("CostManufacturing"),
        icon: Calculator,
        roles: ["admin", "cm_judge"]
      }
    ]
  },
  {
    title: "Team Features",
    items: [
      {
        title: "Feedback Booking",
        url: createPageUrl("FeedbackBooking"),
        icon: Calendar,
        roles: ["admin", "team_captain"]
      }
    ]
  }
];

const adminItems = [
  {
    title: "Admin Panel",
    url: createPageUrl("AdminPanel"),
    icon: Shield,
    roles: ["admin"]
  },
  {
    title: "User Management",
    url: createPageUrl("UserManagement"),
    icon: Users,
    roles: ["admin"]
  },
  {
    title: "System Reports",
    url: createPageUrl("SystemReports"),
    icon: FileText,
    roles: ["admin"]
  },
  {
    title: "Penalty Management",
    url: createPageUrl("PenaltyManagement"),
    icon: Settings,
    roles: ["admin"]
  }
];

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const [user, setUser] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await User.me();
        setUser(currentUser);
      } catch (error) {
        console.log("User not authenticated");
      }
      setLoading(false);
    };
    loadUser();
  }, [location.pathname]);

  const handleLogout = async () => {
    await User.logout();
    window.location.href = createPageUrl("Home");
  };

  const filterItemsByRole = (items) => {
    return items.filter(item => user && item.roles.includes(user.app_role));
  };

  // Don't render layout on Home or Profile pages if user is not fully set up
  if (currentPageName === 'Home' || (currentPageName === 'Profile' && !user)) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gray-50">
        <Sidebar className="border-r border-gray-200">
          <SidebarHeader className="border-b border-gray-200 p-4">
            <Link to={createPageUrl("Dashboard")} className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
                <Flag className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-lg text-gray-900">Formula IHU</h2>
                <p className="text-xs text-gray-500">Competition Hub</p>
              </div>
            </Link>
          </SidebarHeader>

          <SidebarContent className="p-2">
            {/* Main Navigation */}
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {filterItemsByRole(navigationItems).map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        className={`hover:bg-blue-50 hover:text-blue-700 transition-colors duration-200 rounded-lg mb-1 ${
                          location.pathname === item.url ? 'bg-blue-50 text-blue-700 font-medium' : ''
                        }`}
                      >
                        <Link to={item.url} className="flex items-center gap-3 px-3 py-2">
                          <item.icon className="w-4 h-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* Competition Hubs */}
            {competitionHubs.map((hub) => {
              const visibleItems = filterItemsByRole(hub.items);
              if (visibleItems.length === 0) return null;

              return (
                <SidebarGroup key={hub.title}>
                  <SidebarGroupLabel className="text-xs font-medium text-gray-500 uppercase tracking-wider px-2 py-2">
                    {hub.title}
                  </SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {visibleItems.map((item) => (
                        <SidebarMenuItem key={item.title}>
                          <SidebarMenuButton
                            asChild
                            className={`hover:bg-blue-50 hover:text-blue-700 transition-colors duration-200 rounded-lg mb-1 ${
                              location.pathname === item.url ? 'bg-blue-50 text-blue-700 font-medium' : ''
                            }`}
                          >
                            <Link to={item.url} className="flex items-center gap-3 px-3 py-2">
                              <item.icon className="w-4 h-4" />
                              <span>{item.title}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              );
            })}

            {/* Admin Section */}
            {filterItemsByRole(adminItems).length > 0 && (
              <SidebarGroup>
                <SidebarGroupLabel className="text-xs font-medium text-gray-500 uppercase tracking-wider px-2 py-2">
                  Administration
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {filterItemsByRole(adminItems).map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                          asChild
                          className={`hover:bg-blue-50 hover:text-blue-700 transition-colors duration-200 rounded-lg mb-1 ${
                            location.pathname === item.url ? 'bg-blue-50 text-blue-700 font-medium' : ''
                          }`}
                        >
                          <Link to={item.url} className="flex items-center gap-3 px-3 py-2">
                            <item.icon className="w-4 h-4" />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}

            {/* Account Section */}
            {user && (
              <SidebarGroup>
                <SidebarGroupLabel className="text-xs font-medium text-gray-500 uppercase tracking-wider px-2 py-2">
                  Account
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <div className="px-2 space-y-1">
                     <Button asChild variant="ghost" className="w-full justify-start">
                       <Link to={createPageUrl("Profile")}>
                         <UserIcon className="w-4 h-4 mr-2" />
                         My Profile
                       </Link>
                     </Button>
                     <Button variant="ghost" className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50" onClick={handleLogout}>
                       <LogOut className="w-4 h-4 mr-2" />
                       Logout
                     </Button>
                  </div>
                </SidebarGroupContent>
              </SidebarGroup>
            )}
          </SidebarContent>

          <SidebarFooter className="border-t border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-700 font-medium text-sm">
                  {user?.first_name?.[0] || 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 text-sm truncate">
                  {user?.first_name} {user?.last_name}
                </p>
                <p className="text-xs text-gray-500 truncate capitalize">
                  {user?.app_role?.replace('_', ' ')}
                </p>
              </div>
            </div>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col">
          <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4 md:hidden">
              <SidebarTrigger className="hover:bg-gray-100 p-2 rounded-lg transition-colors duration-200" />
              <h1 className="text-xl font-semibold">Formula IHU</h1>
            </div>

            {/* Desktop header with notifications */}
            <div className="hidden md:block">
              <h1 className="text-xl font-semibold text-gray-900">Formula IHU Competition Hub</h1>
            </div>

            {user && (
              <div className="flex items-center gap-2">
                <NotificationSystem user={user} />
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-700 font-medium text-sm">
                    {user?.first_name?.[0] || 'U'}
                  </span>
                </div>
              </div>
            )}
          </header>

          <div className="flex-1 overflow-auto">
            {React.cloneElement(children, { user: user })}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}