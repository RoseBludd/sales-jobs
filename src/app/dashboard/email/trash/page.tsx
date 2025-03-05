'use client';

import { useState } from 'react';
import EmailPage from '../page';

export default function TrashPage() {
  const [folder] = useState<'inbox' | 'sent' | 'draft' | 'trash'>('trash');
  return <EmailPage currentFolder={folder} />;
}