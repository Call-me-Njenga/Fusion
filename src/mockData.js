const LOCS = [
    { loc_id: 'L001', lat: -1.2921, lon: 36.8219, tiv_kes: 5_000_000,   damage_ratio: 0.35, loss_kes: 1_750_000 },
    { loc_id: 'L002', lat: -1.2760, lon: 36.8000, tiv_kes: 12_000_000,  damage_ratio: 0.28, loss_kes: 3_360_000 },
    { loc_id: 'L003', lat: -1.3100, lon: 36.8500, tiv_kes: 3_000_000,   damage_ratio: 0.42, loss_kes: 1_260_000 },
    { loc_id: 'L004', lat: -1.2600, lon: 36.8300, tiv_kes: 55_000_000,  damage_ratio: 0.15, loss_kes: 8_250_000 },
    { loc_id: 'L005', lat: -1.3000, lon: 36.7800, tiv_kes: 22_000_000,  damage_ratio: 0.22, loss_kes: 4_840_000 },
    { loc_id: 'L006', lat: -1.2450, lon: 36.8900, tiv_kes: 8_000_000,   damage_ratio: 0.33, loss_kes: 2_640_000 },
    { loc_id: 'L007', lat: -1.3300, lon: 36.7700, tiv_kes: 1_800_000,   damage_ratio: 0.50, loss_kes:   900_000 },
    { loc_id: 'L008', lat: -1.2850, lon: 36.8500, tiv_kes: 40_000_000,  damage_ratio: 0.18, loss_kes: 7_200_000 },
];

const TOTAL_TIV  = LOCS.reduce((s, l) => s + l.tiv_kes, 0);
const TOTAL_LOSS = LOCS.reduce((s, l) => s + l.loss_kes, 0);

export const MOCK_RESULTS = {
    id: 'demo',
    status: 'done',
    name: 'Westlands Demo Portfolio',
    total_tiv: TOTAL_TIV,
    total_loss: TOTAL_LOSS,
    assumptions: [
        { label: 'Flood depth model', value: 'JBA 30m return-period grid' },
        { label: 'Damage function',   value: 'HAZUS flood, residential' },
        { label: 'Currency',          value: 'KES' },
        { label: 'Portfolio as-of',   value: new Date().toLocaleDateString('en-KE') },
    ],
    explanation:
        'This is a demo explanation. The Westlands portfolio carries the largest single loss because building L004 has the highest insured value in the book. Losses concentrate in the three low-lying clusters near the Nairobi River.',
    ep_curve: [
        { return_period: 10,  loss: 1_200_000 },
        { return_period: 25,  loss: 3_500_000 },
        { return_period: 50,  loss: 8_100_000 },
        { return_period: 100, loss: 14_500_000 },
        { return_period: 200, loss: 22_000_000 },
        { return_period: 500, loss: 30_500_000 },
    ],
    locations: LOCS,
};

export const MOCK_REPLY = 'Based on the demo portfolio, L004 dominates the loss because of its 55M TIV. Focus underwriting attention on L004 and L007 — the latter has the highest damage ratio at 50%.';