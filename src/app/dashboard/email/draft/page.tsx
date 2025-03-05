'use client';

import { useState } from 'react';
import EmailPage from '../page';

export default function DraftPage() {
  const [folder] = useState<'inbox' | 'sent' | 'draft' | 'trash'>('draft');
  return <EmailPage currentFolder={folder} />;
}