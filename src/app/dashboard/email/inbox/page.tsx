'use client';

import { useState } from 'react';
import EmailPage from '../page';

export default function InboxPage() {
  const [folder] = useState<'inbox' | 'sent' | 'draft' | 'trash'>('inbox');
  return <EmailPage currentFolder={folder} />;
}