import React, { useState, useRef, useEffect } from 'react';
import supabase from '../../lib/supabase';
import { Camera, Loader2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';
import { getInitials } from '../../lib/utils';

export default function AvatarUpload() {
  const { profile } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setAvatarUrl(profile?.avatar_url || '');
  }, [profile]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const filePath = `avatars/${profile.id}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: data.publicUrl })
        .eq('id', profile.id);
      if (updateError) throw updateError;

      setAvatarUrl(data.publicUrl);
      toast.success('Avatar updated!');
    } catch (err) {
      toast.error('Failed to upload avatar');
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="relative group">
      <div className="w-20 h-20 rounded-full overflow-hidden bg-primary-100 flex items-center justify-center border-2 border-primary-200">
        {avatarUrl ? (
          <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
        ) : (
          <span className="text-xl font-bold text-primary-600">
            {getInitials(profile?.full_name || 'U')}
          </span>
        )}
      </div>
      <button
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full 
                   opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
      >
        {uploading ? (
          <Loader2 className="w-6 h-6 text-white animate-spin" />
        ) : (
          <Camera className="w-6 h-6 text-white" />
        )}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleUpload}
      />
    </div>
  );
}
