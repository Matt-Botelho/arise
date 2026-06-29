// Catalogue LPC genere automatiquement. Assets sous CC-BY-SA (voir public/lpc/CREDITS.md).
export type Rarity = "base"|"commun"|"rare"|"epique"|"legendaire"|"mythique";
export const RARITY_COLORS: Record<Rarity,string> = {base:"#9aa7b3",commun:"#9aa7b3",rare:"#4d9bff",epique:"#b06bff",legendaire:"#ffcf4d",mythique:"#ff5d7a"};
export const RARITY_LABEL: Record<Rarity,string> = {base:"Base",commun:"Commun",rare:"Rare",epique:"\u00c9pique",legendaire:"L\u00e9gendaire",mythique:"Mythique"};
export type Slot = "hair"|"torso"|"legs"|"feet";
export const EQUIP_SLOTS: Slot[] = ["hair","torso","legs","feet"];
export const SLOT_LABEL: Record<Slot,string> = {hair:"Cheveux",torso:"Torse",legs:"Jambes",feet:"Pieds"};
export type ColorOpt = { name: string; file: string };
export type LpcItem = { key: string; name: string; slot: string; rarity: Rarity; zPos: number; file?: string; colors?: ColorOpt[] };
export const BASE_LAYERS: LpcItem[] = [{key:"body_male",name:"Corps",slot:"body",rarity:"base",zPos:10,file:"/lpc/body/body_male.png"}, {key:"head_male",name:"Tête",slot:"head",rarity:"base",zPos:100,file:"/lpc/head/head_male.png"}];
export const ITEMS: LpcItem[] = [
  {key:"hair_long",name:"Cheveux longs",slot:"hair",rarity:"commun",zPos:120,file:"/lpc/hair/hair_long.png"},
  {key:"hair_plain",name:"Cheveux courts",slot:"hair",rarity:"commun",zPos:120,file:"/lpc/hair/hair_plain.png"},
  {key:"hair_spiked",name:"Cheveux en pics",slot:"hair",rarity:"commun",zPos:120,file:"/lpc/hair/hair_spiked.png"},
  {key:"torso_shirt",name:"Chemise",slot:"torso",rarity:"commun",zPos:35,file:"/lpc/torso/torso_shirt.png"},
  {key:"torso_leather",name:"Armure de cuir",slot:"torso",rarity:"rare",zPos:60,file:"/lpc/torso/torso_leather.png"},
  {key:"torso_legion",name:"Armure de légion",slot:"torso",rarity:"epique",zPos:60,file:"/lpc/torso/torso_legion.png"},
  {key:"torso_plate",name:"Armure de plaques",slot:"torso",rarity:"epique",zPos:60,file:"/lpc/torso/torso_plate.png"},
  {key:"legs_pants",name:"Pantalon",slot:"legs",rarity:"commun",zPos:20,file:"/lpc/legs/legs_pants.png"},
  {key:"legs_armour",name:"Jambières",slot:"legs",rarity:"rare",zPos:20,file:"/lpc/legs/legs_armour.png"},
  {key:"feet_shoes",name:"Chaussures",slot:"feet",rarity:"commun",zPos:15,colors:[{name:"black",file:"/lpc/feet/feet_shoes__black.png"},{name:"blue",file:"/lpc/feet/feet_shoes__blue.png"},{name:"bluegray",file:"/lpc/feet/feet_shoes__bluegray.png"},{name:"brown",file:"/lpc/feet/feet_shoes__brown.png"}]},
  {key:"feet_boots",name:"Bottes",slot:"feet",rarity:"rare",zPos:25,colors:[{name:"black",file:"/lpc/feet/feet_boots__black.png"},{name:"blue",file:"/lpc/feet/feet_boots__blue.png"},{name:"bluegray",file:"/lpc/feet/feet_boots__bluegray.png"},{name:"brown",file:"/lpc/feet/feet_boots__brown.png"}]}
];
export const ALL_LAYERS: LpcItem[] = [...BASE_LAYERS, ...ITEMS];
export const ITEM_BY_KEY: Record<string, LpcItem> = Object.fromEntries(ALL_LAYERS.map((i)=>[i.key,i]));
export type EquipSel = { key: string; color?: string };
export type Equipped = Partial<Record<Slot, EquipSel | null>>;
export const DEFAULT_EQUIPPED: Equipped = { hair:{key:"hair_long"}, torso:{key:"torso_shirt"}, legs:{key:"legs_pants"}, feet:{key:"feet_shoes",color:"black"} };
export const STARTER_ITEMS: string[] = ITEMS.map((i)=>i.key);
export function fileFor(item: LpcItem, color?: string | null): string | null {
  if (item.file) return item.file;
  if (item.colors && item.colors.length) {
    if (color) { const f = item.colors.find((c)=>c.name===color); if (f) return f.file; }
    return item.colors[0].file;
  }
  return null;
}
