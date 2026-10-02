import React from 'react';
import { CommunitiesView } from './CommunitiesView';

interface PagesEventsViewProps {
  initialType?: 'pages' | 'events';
}

export const PagesEventsView: React.FC<PagesEventsViewProps> = ({ initialType = 'pages' }) => {
  return <CommunitiesView initialTab={initialType} />;
};
