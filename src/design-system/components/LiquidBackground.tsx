import React from 'react';

export const LiquidBackground: React.FC = () => {
  return (
    <div className="app-bg-container pointer-events-none" aria-hidden="true">
      {/* 4 Multi-layered animated organic plasma drift blobs */}
      <div className="app-bg-blob blob-1" />
      <div className="app-bg-blob blob-2" />
      <div className="app-bg-blob blob-3" />
      <div className="app-bg-blob blob-4" />
    </div>
  );
};
