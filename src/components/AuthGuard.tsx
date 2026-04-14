import React from 'react';
import { ShieldAlert } from 'lucide-react';

export const AuthGuard = ({ currentUser, requiredRole, requiredPermission, hasPermission, children }: any) => {
  if (!currentUser) {
    return (
      <div className="flex flex-col items-center justify-center p-12 panel-glass rounded-xl border-2 border-sw-red/50 animate-pulse">
        <ShieldAlert size={64} className="text-sw-red mb-4" />
        <h2 className="text-2xl font-bold text-sw-red sw-title-font tracking-widest uppercase">ACCESO RESTRINGIDO</h2>
        <p className="text-gray-400 mt-2 font-bold uppercase tracking-widest text-xs">Inicie sesión para acceder a esta sección.</p>
      </div>
    );
  }

  const isRoleAllowed = !requiredRole || currentUser.role === requiredRole || currentUser.role === 'Admin';
  const isPermissionAllowed = !requiredPermission || (hasPermission && hasPermission(requiredPermission));

  if (!isRoleAllowed || !isPermissionAllowed) {
    return (
      <div className="flex flex-col items-center justify-center p-12 panel-glass rounded-xl border-2 border-sw-red/50">
        <ShieldAlert size={64} className="text-sw-red mb-4" />
        <h2 className="text-2xl font-bold text-sw-red sw-title-font tracking-widest uppercase">PERMISO INSUFICIENTE</h2>
        <p className="text-gray-400 mt-2 font-bold uppercase tracking-widest text-xs">
          {requiredPermission ? `Se requiere permiso: ${requiredPermission}` : `Se requiere rango de ${requiredRole} Imperial.`}
        </p>
      </div>
    );
  }

  return children;
};
