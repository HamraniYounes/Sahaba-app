import { MapPin } from 'lucide-react'

type Props = {
  name: string
  coverImage: string | null
  photos: string[]
}

export default function LocationGallery({ name, coverImage, photos }: Props) {
  return <>
    <div className="overflow-hidden rounded-3xl bg-sahaba-50">
      {coverImage ? <img src={coverImage} alt={name} className="max-h-[520px] w-full object-cover" /> : <div className="flex aspect-[1.6/1] items-center justify-center bg-gradient-to-br from-sahaba-100 to-amber-50"><MapPin size={64} className="text-sahaba-700/40" /></div>}
    </div>
    {photos.length > 1 && <div className="mt-3 grid grid-cols-3 gap-3">{photos.slice(1, 6).map((photo, index) => <img key={photo} src={photo} alt={`${name} — photo ${index + 2}`} loading="lazy" className="h-28 w-full rounded-xl object-cover sm:h-36" />)}</div>}
  </>
}
