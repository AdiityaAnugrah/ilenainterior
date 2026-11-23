import Image from 'next/image';
import Navbar from '@/components/ui/Navbar';

const pages = [
  {
    number: 1,
    title: 'ILENA Interior — sampul portofolio',
    alt: 'Sampul portofolio ILENA Interior dengan logo di atas latar bilah kayu gelap dan informasi kontak.',
    transcript: 'ILENA Interior. Email: ilenafurnitureofficial@gmail.com. Instagram: @ilenafurnitureofficial. Telepon: 0811-2800-8491.',
  },
  {
    number: 2,
    title: 'KosQ — Wall mirror',
    alt: 'Portofolio produk KosQ Wall Mirror dengan foto cermin berbingkai kayu di sisi kanan dan deskripsi di kiri.',
    transcript: 'Product portfolio — KosQ Wall mirror. Featuring a minimalist design with soft curved edges and a natural wood-tone frame, this mirror brings a sense of warmth and understated elegance to any interior. Its simple yet refined silhouette makes it a versatile addition to a variety of interior styles. Perfectly suited for bedrooms, living rooms, or entryways, it adds a decorative touch while enhancing the beauty of every corner of your home.',
  },
  {
    number: 3,
    title: 'KosQ — Aureo floating console',
    alt: 'Halaman Aureo menampilkan satu foto console kayu pada dinding marmer di kiri, judul dan deskripsi di kanan.',
    transcript: 'Aureo — Floating console. Elegance in Every Detail. The combination of beautiful marble textures and the warmth of natural wood creates a calming harmony within the space. Designed with clean lines and a minimalist approach, every detail reflects a thoughtful balance between functionality and aesthetics.',
  },
  {
    number: 4,
    title: 'KosQ — Floating wall shelf',
    alt: 'Kolase rak dinding kayu melayang dengan judul besar dan deskripsi produk.',
    transcript: 'Floating Wall Shelf — Designed to Complement. Bringing together geometric design and the warmth of natural wood textures, AUREO is crafted to add an aesthetic touch to every corner of the space. Its clean silhouette, complemented by distinctive construction details, creates a look that feels both modern and timeless. More than just a storage solution, this design serves as a decorative element that enhances the wall and adds character to the overall interior.',
  },
  {
    number: 5,
    title: 'KosQ — Bed Headboard & Side Table',
    alt: 'Foto headboard dan meja samping tempat tidur dengan detail panel kayu vertikal.',
    transcript: 'Bed Headboard & Side Table — ARVEN. Designed to bring warmth and character into the bedroom, this custom bedroom set combines a beautifully crafted wooden headboard with integrated side table storage. The vertical slat detailing creates a distinctive visual rhythm, complemented by soft upholstered padding for added comfort. A thoughtful combination of natural textures, functional elements, and refined craftsmanship creates a cohesive bedroom atmosphere that balances everyday practicality with timeless aesthetics.',
  },
  {
    number: 6,
    title: 'KosQ — Wardrobe & Study Desk',
    alt: 'Kolase lemari pakaian dan meja belajar yang terintegrasi dengan rak terbuka dan laci.',
    transcript: 'Wardrobe & Study Desk — ELVAR. Designed to maximize space while maintaining a refined aesthetic, this custom furniture combines wardrobe storage and a dedicated workspace in one seamless composition. The natural wood finish brings warmth to the interior, while open shelving and integrated drawers provide practical storage solutions. Every element is thoughtfully arranged to create a functional and cohesive space, balancing everyday convenience with clean, timeless design.',
  },
  {
    number: 7,
    title: 'Bu A** House — Marble Vanity Cabinet',
    alt: 'Kabinet vanity kamar mandi bernuansa taupe dengan wastafel marmer, ditampilkan dalam komposisi editorial bernomor 06.',
    transcript: 'Bu A** House — Marble Vanity Cabinet, 06. Crafted for Everyday Comfort. A thoughtful blend of natural marble and refined cabinetry, this custom vanity cabinet brings a sense of understated elegance to the bathroom. The warm taupe finish complements the distinctive marble patterns, creating a harmonious balance of textures and tones. Designed with integrated drawers for practical storage, every element is carefully considered to combine everyday functionality with a timeless aesthetic.',
  },
  {
    number: 8,
    title: 'Bu A** House — Marble Vanity details',
    alt: 'Tiga foto detail vanity kamar mandi, termasuk kabinet, laci, dan wastafel marmer.',
    transcript: 'Bu A** House — foto detail kabinet vanity, material marmer, wastafel, dan penyimpanan laci.',
  },
  {
    number: 9,
    title: 'Bu A** House — Concealed Bookshelf Door',
    alt: 'Pintu tersembunyi yang menyatu dengan panel kayu dan berfungsi sebagai rak buku, diberi nomor 01.',
    transcript: 'Bu A** House — Concealed Bookshelf Door, 01. Seamless Design, Hidden Purpose. Designed to blend seamlessly into its surroundings, this custom concealed door features a clean, minimalist exterior that maintains the visual harmony of the interior. Behind its understated white surface lies a functional bookshelf, transforming an ordinary doorway into a thoughtfully integrated storage feature.',
  },
  {
    number: 10,
    title: 'Bu A** House — Concealed Bookshelf Door details',
    alt: 'Kolase detail pintu buku tersembunyi, rak internal, pencahayaan, serta foto penggunaan di ruang.',
    transcript: 'Bu A** House — detail pintu bookshelf tersembunyi. Enhanced with built-in ambient lighting that can be switched on and off, the interior creates a warm and inviting display while adding another layer of functionality. A clever combination of discreet design, practical storage, and thoughtful detailing.',
  },
  {
    number: 11,
    title: 'Bu A** House — Custom Kitchen Set',
    alt: 'Dua foto dapur custom dengan kabinet atas-bawah, penyimpanan terintegrasi, dan backsplash marmer.',
    transcript: 'Bu A** House — Custom Kitchen Set. Crafted for Modern Living. A fully customized kitchen designed to bring functionality and refined aesthetics into one cohesive space. Featuring a combination of thoughtfully arranged upper and lower cabinetry, integrated storage, and elegant marble finishes, every element is tailored to complement the overall interior. A harmonious blend of craftsmanship, practicality, and timeless design.',
  },
  {
    number: 12,
    title: 'Bu A** House — Kitchen details',
    alt: 'Kolase detail kabinet dapur, aksen kayu, marmer, rak terbuka, dan pencahayaan LED.',
    transcript: 'Bu A** House — detail kitchen set. The warm wood accents and subtle cabinet tones create a balanced, sophisticated atmosphere, while integrated LED strip lighting adds depth and warmth to the space. Designed with adjustable lighting that can be switched on and off, every detail reflects a thoughtful approach to modern living.',
  },
  {
    number: 13,
    title: 'Bu A** House — Illuminated Wooden Staircase',
    alt: 'Tangga kayu dengan pencahayaan LED di bawah tiap anak tangga, diberi nomor 07 dan nama Lumora.',
    transcript: 'Bu A** House — Illuminated Wooden Staircase, 07. Where Light Meets Craftsmanship — LUMORA. Integrated LED strip lighting beneath each step adds depth and dimension, highlighting the natural wood texture and enhancing the overall ambience. With lighting that can be switched on and off, the staircase brings together thoughtful functionality and refined aesthetics in every detail.',
  },
  {
    number: 14,
    title: 'Bu A** House — Staircase gallery',
    alt: 'Empat foto detail tangga kayu bercahaya dan panel dinding berpola geometris.',
    transcript: 'Bu A** House — staircase gallery. A distinctive staircase design that combines the natural warmth of wood with striking architectural details. Featuring custom-crafted wooden steps and geometrically patterned wall panels, the design creates a bold visual statement while maintaining a warm and inviting atmosphere.',
  },
];

export default function PortfolioPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="bg-white pt-16">
        <h1 className="sr-only">Portofolio ILENA Interior</h1>
        <ol aria-label="Halaman portofolio ILENA Interior" className="m-0 list-none p-0">
          {pages.map((page, index) => {
            const src = `/portfolio/reference/page-${String(page.number).padStart(2, '0')}.webp`;
            return (
              <li key={page.number}>
                <figure className="m-0">
                  <a
                    href={src}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Buka gambar resolusi penuh: ${page.title}`}
                    className="block focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-[-4px] focus-visible:outline-stone-800"
                  >
                    <Image
                      src={src}
                      alt={page.alt}
                      width={1191}
                      height={839}
                      sizes="100vw"
                      priority={index === 0}
                      className="h-auto w-full"
                    />
                  </a>
                  <figcaption className="sr-only">{page.transcript}</figcaption>
                </figure>
              </li>
            );
          })}
        </ol>
      </main>
    </div>
  );
}
