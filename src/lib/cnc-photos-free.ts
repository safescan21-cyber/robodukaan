// Freely licensed photos (Wikimedia Commons) of the exact machine model, shown with the credit and licence the
// licence requires. Only photos whose file page names that model are listed. Admin uploads (Admin → CNC photos)
// take priority over these. Checked: Commons has no free photos of the other listed models (Nov 2026).
import type { MachinePhoto } from "@/components/MachineArt";

export const FREE_CNC_PHOTOS: Record<string, MachinePhoto> = {
  "makino-iq300": {
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Makino_iQ300.jpg/500px-Makino_iQ300.jpg",
    credit: "Andreas Walbert",
    license: "CC BY-SA 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Makino_iQ300.jpg",
  },
};
