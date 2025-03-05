'use client';

import { useState } from 'react';
import EmailPage from '../page';

export default function SentPage() {
  const [folder] = useState<'inbox' | 'sent' | 'draft' | 'trash'>('sent');
  return <EmailPage currentFolder={folder} />;
}