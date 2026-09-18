import { useNavigate } from 'react-router-dom';
import { Compass } from 'lucide-react';

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-3 text-t3">
        <Compass size={30} />
      </div>
      <h1 className="mt-5 text-3xl font-bold text-t1">404</h1>
      <p className="mt-2 text-sm text-t3">页面不存在或已被移动</p>
      <button onClick={() => navigate('/')} className="btn-primary mt-6">
        返回仪表盘
      </button>
    </div>
  );
}
