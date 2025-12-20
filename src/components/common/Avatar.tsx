
interface AvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Avatar({ name, size = 'md', className = '' }: AvatarProps) {
  return (
    <div className={`avatar avatar-${size} ${className}`}>
      {name[0]?.toUpperCase() || '?'}
    </div>
  );
}
