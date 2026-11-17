import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import SiteLayout from './components/Layout'
import DashLayout from './components/DashLayout'
import AuthModal from './components/AuthModal'
import { PageLoader } from './components/ui'
import Home from './pages/Home'
import Search from './pages/Search'
import Property from './pages/Property'
import Checkout from './pages/Checkout'
import HostLanding from './pages/HostLanding'
import { Bookings, Favorites, Notifications, Profile, StaticPage, Support } from './pages/Account'
import { HostBookings, HostHome, HostProperties } from './pages/host/HostPages'
import PropertyWizard from './pages/host/PropertyWizard'
import { HostInbox, HostReports, HostServices } from './pages/host/HostMore'
import { ProviderBookings, ProviderEarnings, ProviderHome, ProviderServices } from './pages/provider/ProviderPages'
import {
  AdminBookings, AdminCatalog, AdminHome, AdminNotifications, AdminOffers, AdminProperties, AdminServices, AdminSettings, AdminTickets, AdminUsers,
} from './pages/admin/AdminPages'
import { useAuth } from './lib/store'

const hostLinks = [
  ['/host', 'layout-dashboard', 'الرئيسية', 'Overview'],
  ['/host/properties', 'building-2', 'إدارة العقارات', 'Properties'],
  ['/host/bookings', 'calendar-check', 'الحجوزات', 'Bookings'],
  ['/host/services', 'sparkles', 'طلب خدمات', 'Services'],
  ['/host/reports', 'bar-chart-3', 'التقارير والتحليلات', 'Reports'],
  ['/host/inbox', 'message-square', 'التواصل مع الضيوف', 'Guests'],
  ['/profile', 'settings', 'إعدادات الحساب', 'Account'],
]
const providerLinks = [
  ['/provider', 'layout-dashboard', 'الرئيسية', 'Home'],
  ['/provider/bookings', 'calendar-check', 'الحجوزات', 'Bookings'],
  ['/provider/services', 'wrench', 'إدارة الخدمات', 'My services'],
  ['/provider/earnings', 'wallet', 'النسب والأرباح', 'Earnings'],
  ['/support', 'life-buoy', 'الدعم والمساعدة', 'Support'],
  ['/profile', 'settings', 'الإعدادات', 'Settings'],
]
const adminLinks = [
  ['/admin', 'layout-dashboard', 'الرئيسية', 'Overview'],
  ['/admin/users', 'users', 'حسابات المستخدمين', 'Users'],
  ['/admin/properties', 'building-2', 'إدارة العقارات', 'Listings'],
  ['/admin/bookings', 'calendar-check', 'الحجوزات', 'Bookings'],
  ['/admin/services', 'wrench', 'إدارة الخدمات', 'Services'],
  ['/admin/offers', 'tag', 'العروض المميزة', 'Offers'],
  ['/admin/notifications', 'megaphone', 'إدارة الإشعارات', 'Notifications'],
  ['/admin/tickets', 'life-buoy', 'الدعم الفني', 'Support'],
  ['/admin/catalog', 'list-checks', 'القوائم والتصنيفات', 'Catalog'],
  ['/admin/settings', 'settings', 'الإعدادات', 'Settings'],
]

function RequireUser({ children }) {
  const { user, requireAuth } = useAuth()
  useEffect(() => { if (!user) requireAuth({ mode: 'login' }) }, [user]) // eslint-disable-line react-hooks/exhaustive-deps
  return user ? children : <PageLoader />
}

export default function App() {
  return (
    <>
      <Routes>
        <Route element={<SiteLayout />}>
          <Route index element={<Home />} />
          <Route path="search" element={<Search />} />
          <Route path="property/:id" element={<Property />} />
          <Route path="host-with-us" element={<HostLanding />} />
          <Route path="checkout/:id" element={<RequireUser><Checkout /></RequireUser>} />
          <Route path="bookings" element={<RequireUser><Bookings /></RequireUser>} />
          <Route path="favorites" element={<RequireUser><Favorites /></RequireUser>} />
          <Route path="profile" element={<RequireUser><Profile /></RequireUser>} />
          <Route path="notifications" element={<RequireUser><Notifications /></RequireUser>} />
          <Route path="support" element={<RequireUser><Support /></RequireUser>} />
          {['about', 'terms', 'privacy', 'faq'].map((k) => <Route key={k} path={k} element={<StaticPage kind={k} />} />)}
        </Route>

        <Route path="host" element={<DashLayout roles={['Host', 'Admin']} links={hostLinks} title="المضيف · Host" />}>
          <Route index element={<HostHome />} />
          <Route path="properties" element={<HostProperties />} />
          <Route path="properties/new" element={<PropertyWizard />} />
          <Route path="properties/:id" element={<PropertyWizard />} />
          <Route path="bookings" element={<HostBookings />} />
          <Route path="services" element={<HostServices />} />
          <Route path="reports" element={<HostReports />} />
          <Route path="inbox" element={<HostInbox />} />
        </Route>

        <Route path="provider" element={<DashLayout roles={['Provider', 'Admin']} links={providerLinks} title="مقدم الخدمة · Provider" />}>
          <Route index element={<ProviderHome />} />
          <Route path="bookings" element={<ProviderBookings />} />
          <Route path="services" element={<ProviderServices />} />
          <Route path="earnings" element={<ProviderEarnings />} />
        </Route>

        <Route path="admin" element={<DashLayout roles={['Admin']} links={adminLinks} title="الإدارة · Admin" />}>
          <Route index element={<AdminHome />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="properties" element={<AdminProperties />} />
          <Route path="bookings" element={<AdminBookings />} />
          <Route path="services" element={<AdminServices />} />
          <Route path="offers" element={<AdminOffers />} />
          <Route path="notifications" element={<AdminNotifications />} />
          <Route path="tickets" element={<AdminTickets />} />
          <Route path="catalog" element={<AdminCatalog />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <AuthModal />
    </>
  )
}
