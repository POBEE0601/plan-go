// 2026-09-01 로딩 화면 모바일 높이
// 2026-08-31 라우팅: 홈·인증·대시보드·초대·고객게시판·공지·배포
import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import ProtectedRoute from './components/ProtectedRoute';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import InvitePage from './pages/InvitePage';
import BoardPage from './pages/BoardPage';
import NoticePage from './pages/NoticePage';
import ReleasePage from './pages/ReleasePage';
import { useAuthStore } from './store/useAuthStore';

function AppRoutes() {
  const { initialize, isLoading, isAuthenticated } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route
        path="/login"
        element={
          isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />
        }
      />
      <Route
        path="/register"
        element={
          isAuthenticated ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <RegisterPage />
          )
        }
      />
      <Route path="/invite/:token" element={<InvitePage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/board/*"
        element={
          <ProtectedRoute>
            <BoardPage />
          </ProtectedRoute>
        }
      />
      {/* 공지사항: 비회원 조회 가능 */}
      <Route path="/notices/*" element={<NoticePage />} />
      {/* 2026-08-31 배포게시판: 비회원 조회, 작성은 관리자만 */}
      <Route path="/releases/*" element={<ReleasePage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
