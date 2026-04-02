'use client';

import React from 'react';

export default function LoadingScreen() {
  return (
    <div className="loading-screen">
      <div className="loading-inner">
        <div className="loading-spinner" />
        <h2 className="loading-title">Carregando Mapa</h2>
        <p className="loading-sub">Buscando dados do ClickUp...</p>
      </div>
    </div>
  );
}
