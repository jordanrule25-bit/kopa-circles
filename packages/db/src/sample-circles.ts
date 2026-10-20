// FICTIONAL SAMPLE DATA. These circles, members and lenders do not exist.
// Copied from sample() in prototype/index.html so the app and the prototype tell the same story.

export interface SampleMember {
  name: string;
  business: string;
  amountUsd: number;
}

export interface SampleCircle {
  key: string;
  name: string;
  town: string;
  sector: string;
  cycle: number;
  score: "A" | "B" | "C";
  status: "RAISING" | "REPAYING";
  /** USD already raised from other lenders (raising circles only). */
  fundedUsd: number;
  /** Weeks repaid so far (repaying circles only). */
  week: number;
  /** The demo lender's stake in USD, the "You" in the prototype. */
  demoLenderUsd: number;
  story: string;
  members: SampleMember[];
}

const m = (name: string, business: string, amountUsd: number): SampleMember => ({ name, business, amountUsd });

export const SAMPLE_KES_PER_USD = 129;
/** Starting reserve in the prototype, before this sample's own disbursals. */
export const SAMPLE_OPENING_RESERVE_USD = 1_800;
/** The demo lender's uninvested balance in the prototype. */
export const SAMPLE_DEMO_WALLET_USD = 425;

export const SAMPLE_CIRCLES: SampleCircle[] = [
  {
    key: "c1", name: "Mama Mboga Five", town: "Kisumu", sector: "Retail and food", cycle: 3, score: "A",
    status: "RAISING", fundedUsd: 180, week: 0, demoLenderUsd: 0,
    story: "Vegetable and fish sellers at Kibuye market who have met every Thursday for four years. Third loan: bulk buying before the December rush.",
    members: [m("Achieng O.", "Vegetable stall", 300), m("Atieno A.", "Fish trader", 280), m("Akinyi W.", "Fruit and onions", 260), m("Adhiambo K.", "Cooked food kiosk", 240), m("Awuor M.", "Dry goods", 250)],
  },
  {
    key: "c2", name: "Sindano Tailors", town: "Nakuru", sector: "Tailoring and crafts", cycle: 1, score: "B",
    status: "RAISING", fundedUsd: 325, week: 0, demoLenderUsd: 0,
    story: "Five tailors sharing a workshop near the bus park. First loan buys a second sewing machine and school-uniform fabric for January.",
    members: [m("Wanjiru N.", "School uniforms", 150), m("Njeri K.", "Alterations", 120), m("Wambui G.", "Kitenge dresses", 150), m("Nyambura M.", "Beadwork", 100), m("Muthoni J.", "Curtains", 140)],
  },
  {
    key: "c3", name: "Kiboko Poultry", town: "Machakos", sector: "Agriculture", cycle: 2, score: "B",
    status: "RAISING", fundedUsd: 90, week: 0, demoLenderUsd: 0,
    story: "Smallholders raising improved kienyeji chickens. Second loan covers chicks, feed and a shared incubator.",
    members: [m("Mutua K.", "Layers", 200), m("Mwende S.", "Broilers", 190), m("Kioko P.", "Feed resale", 180), m("Ndinda W.", "Eggs", 170), m("Musyoka D.", "Chick brooding", 190)],
  },
  {
    key: "c4", name: "Boda Fix Collective", town: "Thika", sector: "Transport repair", cycle: 1, score: "C",
    status: "RAISING", fundedUsd: 40, week: 0, demoLenderUsd: 0,
    story: "Motorbike mechanics and spare-parts sellers on the Thika road. First loan stocks fast-moving parts.",
    members: [m("Kamau P.", "Spare parts", 150), m("Mwangi T.", "Tyre repair", 130), m("Njoroge L.", "Welding", 150), m("Kariuki B.", "Brake repair", 120), m("Gitau F.", "Oil and lubes", 140)],
  },
  {
    key: "c5", name: "Kapsoya Dairy Goats", town: "Eldoret", sector: "Agriculture", cycle: 2, score: "A",
    status: "REPAYING", fundedUsd: 0, week: 9, demoLenderUsd: 50,
    story: "Women keeping dairy goats on small plots. Second loan, repaying on schedule.",
    members: [m("Chebet R.", "Goat milk", 220), m("Jepkosgei A.", "Fodder", 190), m("Kiprop E.", "Goat breeding", 210), m("Jeruto C.", "Milk delivery", 195), m("Cherono V.", "Yoghurt", 200)],
  },
  {
    key: "c6", name: "Mitumba Row", town: "Kitengela", sector: "Retail and food", cycle: 1, score: "B",
    status: "REPAYING", fundedUsd: 0, week: 5, demoLenderUsd: 25,
    story: "Second-hand clothing sellers sharing one market lane. First loan, bought bales for the long rains season.",
    members: [m("Omondi J.", "Jeans and jackets", 150), m("Otieno S.", "Shoes", 140), m("Nekesa L.", "Children's clothes", 130), m("Wekesa D.", "Bags", 140), m("Naliaka R.", "Bedsheets", 140)],
  },
];
