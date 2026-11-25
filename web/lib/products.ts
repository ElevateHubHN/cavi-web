/**
 * Línea de negocio del repuesto. CAVI atiende equipo pesado (maquinaria) y
 * vehículo liviano (carros asiáticos y americanos).
 */
export type ProductLine = "pesado" | "liviano";

export type Product = {
  id: string;
  name: string;
  part: string;
  brand: string;
  cat: string;
  /** Subcategoría opcional dentro de `cat` (ver `subcategories`). */
  subcat?: string;
  compat: string[];
  desc: string;
  specs: [string, string][];
  /** Ruta de imagen alternativa; por defecto se usa `/images/products/{id}.webp`. */
  image?: string;
  /** Línea de negocio. Si falta, es "pesado", la línea original del catálogo. */
  line?: ProductLine;
};

export function isProductLine(value: string): value is ProductLine {
  return value === "pesado" || value === "liviano";
}

/** Línea del producto; "pesado" si no la declara. */
export function getProductLine(product: Pick<Product, "line">): ProductLine {
  return product.line ?? "pesado";
}

export const products: Product[] = [
  {
    id: "p1",
    name: "Bomba hidráulica principal",
    part: "HYD-4720",
    brand: "Bulltorque",
    cat: "Hidráulica",
    subcat: "Bombas hidráulicas",
    compat: ["Freightliner Cascadia", "Kenworth T680"],
    desc: "Bomba de pistones axiales para el sistema hidráulico del camión (volteo, grúa y equipo auxiliar). Caudal y presión de trabajo según especificación de fábrica.",
    specs: [
      ["Tipo", "Pistón axial"],
      ["Presión máx.", "350 bar"],
      ["Caudal", "230 L/min"],
      ["Rotación", "Horaria"],
    ],
  },
  {
    id: "p2",
    name: "Kit de sellos hidráulicos",
    part: "SEAL-118",
    brand: "National",
    cat: "Hidráulica",
    subcat: "Sellos hidráulicos",
    compat: ["Peterbilt 389", "Mack Granite"],
    desc: "Juego completo de sellos y o-rings para cilindro hidráulico. Material resistente a alta temperatura y presión.",
    specs: [
      ["Piezas", "24"],
      ["Material", "Poliuretano / NBR"],
      ["Temp. máx.", "120 °C"],
      ["Aplicación", "Cilindro de pluma"],
    ],
  },
  {
    id: "p3",
    name: "Turbocompresor",
    part: "TRB-6650",
    brand: "PAI",
    cat: "Motor",
    subcat: "Turbos",
    compat: ["Volvo VNL", "Mack Anthem"],
    desc: "Turbocompresor de geometría fija para motor diésel de alto rendimiento. Balanceado y probado.",
    specs: [
      ["Tipo", "Geometría fija"],
      ["Rodamiento", "Flotante"],
      ["Entrada aceite", "M12"],
      ["Balanceado", "Sí"],
    ],
  },
  {
    id: "p4",
    name: "Filtro de aceite de motor",
    part: "FLT-2201",
    brand: "Donaldson",
    cat: "Filtros",
    subcat: "Aceite",
    compat: ["Freightliner Cascadia", "International LT"],
    desc: "Filtro de aceite de flujo total con válvula anti-drenaje. Alta capacidad de retención de partículas.",
    specs: [
      ["Micraje", "15 µm"],
      ["Rosca", "1-12 UN"],
      ["Altura", "142 mm"],
      ["Anti-drenaje", "Sí"],
    ],
  },
  {
    id: "p5",
    name: "Filtro de combustible separador",
    part: "FLT-3390",
    brand: "Donaldson",
    cat: "Filtros",
    subcat: "Separadores de agua",
    compat: ["Kenworth T880", "Peterbilt 579"],
    desc: "Filtro separador de agua para sistema de combustible diésel. Protege la bomba de inyección.",
    specs: [
      ["Micraje", "10 µm"],
      ["Separación agua", "Sí"],
      ["Caudal", "180 L/h"],
      ["Rosca", "M16"],
    ],
  },
  {
    id: "p6",
    name: "Kit de embrague completo",
    part: "CLT-9010",
    brand: "PAI",
    cat: "Transmisión",
    subcat: "Embragues",
    compat: ["Mack Pinnacle", "Volvo VNR"],
    desc: "Kit de embrague con disco, plato de presión y cojinete. Reemplazo directo para camión pesado.",
    specs: [
      ["Diámetro", "330 mm"],
      ["Estrías", "10"],
      ["Incluye", "Disco + plato + collarín"],
      ["Accionamiento", "Hidráulico"],
    ],
  },
  {
    id: "p7",
    name: "Juego de pastillas de freno",
    part: "BRK-5540",
    brand: "Sampa",
    cat: "Frenos",
    subcat: "Pastillas y fricciones",
    compat: ["Freightliner M2 106", "Hino 268"],
    desc: "Pastillas de freno de alta fricción para servicio severo en equipo pesado.",
    specs: [
      ["Material", "Semi-metálico"],
      ["Piezas", "4"],
      ["Temp. máx.", "450 °C"],
      ["Espesor", "18 mm"],
    ],
  },
  {
    id: "p8",
    name: "Radiador de refrigeración",
    part: "RAD-8800",
    brand: "GRC",
    cat: "Refrigeración",
    subcat: "Radiadores",
    compat: ["Kenworth T680", "Peterbilt 389"],
    desc: "Radiador de aluminio de alta disipación para motor diésel. Núcleo reforzado.",
    specs: [
      ["Material", "Aluminio"],
      ["Filas", "2"],
      ["Entrada", "50 mm"],
      ["Presión", "1.1 bar"],
    ],
  },
  {
    id: "p9",
    name: "Alternador 24V 80A",
    part: "ELE-2415",
    brand: "Delco Remy",
    cat: "Eléctricos",
    subcat: "Alternadores",
    compat: ["Volvo VNL", "Mack Anthem"],
    desc: "Alternador de 24 voltios con regulador integrado. Alta durabilidad en ambientes de polvo.",
    specs: [
      ["Voltaje", "24 V"],
      ["Amperaje", "80 A"],
      ["Polea", "Canal V"],
      ["Regulador", "Integrado"],
    ],
  },
  {
    id: "p10",
    name: "Kit de corona y piñón",
    part: "DIF-7720",
    brand: "PAI",
    cat: "Ejes y diferenciales",
    subcat: "Coronas y piñones",
    compat: ["Mack Granite", "Kenworth T880"],
    desc: "Juego de corona y piñón para diferencial de camión pesado. Dentado cementado y contacto rectificado de fábrica.",
    specs: [
      ["Relación", "4.11"],
      ["Dientes", "37/9"],
      ["Material", "Acero cementado"],
      ["Aplicación", "Eje trasero motriz"],
    ],
    image: "/images/products/p6.webp",
  },
  {
    id: "p11",
    name: "Inyector diésel electrónico",
    part: "INJ-6120",
    brand: "FP Diesel",
    cat: "Motor",
    subcat: "Sistema de combustible",
    compat: ["International ProStar", "Volvo VNL"],
    desc: "Inyector electrónico HEUI probado y calibrado en banco. Reemplazo de precisión.",
    specs: [
      ["Tipo", "HEUI"],
      ["Presión", "2000 bar"],
      ["Orificios", "6"],
      ["Calibrado", "Sí"],
    ],
  },
  {
    id: "p12",
    name: "Maza de rueda delantera",
    part: "MAZ-4410",
    brand: "Automann",
    cat: "Ejes y diferenciales",
    subcat: "Mazas y baleros",
    compat: ["Freightliner Cascadia", "Peterbilt 579"],
    desc: "Maza de rueda delantera en hierro nodular, mecanizada para baleros cónicos y retenedor de aceite.",
    specs: [
      ["Material", "Hierro nodular"],
      ["Pernos", "10 × 285 mm"],
      ["Retenedor", "Incluido"],
      ["Aplicación", "Eje direccional"],
    ],
    image: "/images/products/p13.webp",
  },
  {
    id: "p13",
    name: "Bomba de agua",
    part: "WPU-3320",
    brand: "PAI",
    cat: "Motor",
    subcat: "Bombas de aceite y agua",
    compat: ["Mack Anthem", "Volvo VHD"],
    desc: "Bomba de agua con impulsor reforzado para el sistema de enfriamiento del motor. Sello mecánico de larga duración.",
    specs: [
      ["Impulsor", "Metálico"],
      ["Sello", "Mecánico"],
      ["Polea", "Prensada"],
      ["Empaques", "Incluidos"],
    ],
  },
  {
    id: "p14",
    name: "Kit de anillos de pistón",
    part: "RNG-2245",
    brand: "FP Diesel",
    cat: "Motor",
    subcat: "Pistones y anillos",
    compat: ["International LT", "Freightliner Columbia"],
    desc: "Juego de anillos de pistón para reparación de motor. Ajuste de precisión y bajo consumo de aceite.",
    specs: [
      ["Cilindros", "6"],
      ["Material", "Fundición cromada"],
      ["Medida", "STD"],
      ["Piezas", "18"],
    ],
  },
  {
    id: "p15",
    name: "Válvula de control principal",
    part: "VLV-5510",
    brand: "Bulltorque",
    cat: "Hidráulica",
    subcat: "Válvulas",
    compat: ["Kenworth T880", "Mack Granite"],
    desc: "Bloque de válvulas de control para la distribución hidráulica del camión. Probado a presión de trabajo.",
    specs: [
      ["Secciones", "6"],
      ["Presión", "340 bar"],
      ["Carretes", "Deslizantes"],
      ["Probado", "En banco"],
    ],
  },
  {
    id: "p16",
    name: "Cilindro hidráulico de pluma",
    part: "CYL-9900",
    brand: "SAP",
    cat: "Hidráulica",
    subcat: "Cilindros",
    compat: ["Peterbilt 389", "International 4300"],
    desc: "Cilindro hidráulico de pluma con vástago cromado y sellos nuevos. Reemplazo directo.",
    specs: [
      ["Diámetro", "120 mm"],
      ["Carrera", "1350 mm"],
      ["Vástago", "Cromado"],
      ["Sellos", "Incluidos"],
    ],
  },
  {
    id: "p17",
    name: "Kit de king pin con bujes",
    part: "KPN-6600",
    brand: "Sampa",
    cat: "Ejes y diferenciales",
    subcat: "King pins y muñones",
    compat: ["Freightliner M2 106", "Hino 338"],
    desc: "Juego completo de king pin para muñón de dirección: perno, bujes, sellos y arandelas de empuje.",
    specs: [
      ["Perno", "Acero cementado"],
      ["Bujes", "Bronce"],
      ["Sellos", "Incluidos"],
      ["Aplicación", "Eje direccional"],
    ],
    image: "/images/products/p2.webp",
  },
  {
    id: "p18",
    name: "Balero de rueda cónico",
    part: "BAL-4020",
    brand: "National",
    cat: "Ejes y diferenciales",
    subcat: "Mazas y baleros",
    compat: ["Volvo VNR", "Mack Pinnacle"],
    desc: "Balero cónico de rodillos para maza de rueda, con copa y cono emparejados de fábrica.",
    specs: [
      ["Tipo", "Rodillo cónico"],
      ["Diám. interior", "80 mm"],
      ["Diám. exterior", "140 mm"],
      ["Juego", "Copa y cono"],
    ],
    image: "/images/products/p14.webp",
  },

  // Productos de ejemplo para las subcategorías.
  {
    id: "p19",
    name: "Culata completa de motor",
    part: "HED-4108",
    brand: "PAI",
    cat: "Motor",
    subcat: "Bloque y culatas",
    compat: ["Volvo VNL", "Mack Anthem"],
    desc: "Culata completa con válvulas, guías y asientos montados. Superficie rectificada y probada a presión.",
    specs: [
      ["Cilindros", "6"],
      ["Válvulas", "12"],
      ["Material", "Fundición gris"],
      ["Prueba", "Hidrostática"],
    ],
    image: "/images/products/p3.webp",
  },
  {
    id: "p20",
    name: "Kit de camisas de cilindro",
    part: "LNR-2260",
    brand: "PowerHaus Diesel",
    cat: "Motor",
    subcat: "Bloque y culatas",
    compat: ["International ProStar", "Freightliner Cascadia"],
    desc: "Juego de camisas húmedas para reparación de bloque. Incluye o-rings de sellado inferior.",
    specs: [
      ["Piezas", "6"],
      ["Tipo", "Húmeda"],
      ["Diámetro", "110 mm"],
      ["Incluye", "O-rings"],
    ],
    image: "/images/products/p14.webp",
  },
  {
    id: "p21",
    name: "Empaque de culata",
    part: "GSK-3050",
    brand: "FP Diesel",
    cat: "Motor",
    subcat: "Empaques y sellos",
    compat: ["Kenworth T680", "Peterbilt 579"],
    desc: "Empaque de culata multicapa metálico para alta compresión. Reemplazo directo en reparación de motor.",
    specs: [
      ["Tipo", "Multicapa (MLS)"],
      ["Espesor", "1.4 mm"],
      ["Cilindros", "6"],
      ["Material", "Acero inoxidable"],
    ],
    image: "/images/products/p14.webp",
  },
  {
    id: "p22",
    name: "Juego completo de empaques de motor",
    part: "GSK-7715",
    brand: "FP Diesel",
    cat: "Motor",
    subcat: "Empaques y sellos",
    compat: ["Volvo VNL", "Mack Granite"],
    desc: "Kit integral de empaques y retenedores para overhaul de motor diésel. Incluye sellos de cigüeñal.",
    specs: [
      ["Piezas", "68"],
      ["Alcance", "Overhaul completo"],
      ["Incluye", "Retenedores de cigüeñal"],
      ["Material", "Fibra / NBR"],
    ],
    image: "/images/products/p13.webp",
  },
  {
    id: "p23",
    name: "Banda de accesorios poly-V",
    part: "BLT-1140",
    brand: "S&S Power Up",
    cat: "Motor",
    subcat: "Bandas y tensores",
    compat: ["Freightliner M2 106", "Hino 500"],
    desc: "Banda de accesorios de nervaduras múltiples para alternador y bomba de agua. Alta resistencia al calor.",
    specs: [
      ["Perfil", "8PK"],
      ["Longitud", "1850 mm"],
      ["Material", "EPDM"],
      ["Nervaduras", "8"],
    ],
    image: "/images/products/p13.webp",
  },
  {
    id: "p24",
    name: "Tensor automático de banda",
    part: "TNS-2210",
    brand: "S&S Power Up",
    cat: "Motor",
    subcat: "Bandas y tensores",
    compat: ["International 4300", "Isuzu FRR"],
    desc: "Tensor automático con polea y rodamiento sellado. Mantiene la tensión correcta de la banda de accesorios.",
    specs: [
      ["Tipo", "Automático"],
      ["Polea", "Metálica"],
      ["Rodamiento", "Sellado"],
      ["Diámetro polea", "76 mm"],
    ],
    image: "/images/products/p3.webp",
  },

  // Más productos de ejemplo para las subcategorías.
  {
    id: "p25",
    name: "Manguera hidráulica de alta presión",
    part: "HOS-1225",
    brand: "SAP",
    cat: "Hidráulica",
    subcat: "Mangueras y acoples",
    compat: ["Peterbilt 389", "Kenworth W900"],
    desc: "Manguera de dos mallas de acero para líneas de alta presión, ensamblada con acoples prensados a la medida del equipo.",
    specs: [
      ["Norma", "SAE 100 R2"],
      ["Presión de trabajo", "350 bar"],
      ["Diámetro interior", "1/2\""],
      ["Acoples", "JIC 37°"],
    ],
    image: "/images/products/p2.webp",
  },
  {
    id: "p26",
    name: "Convertidor de torque",
    part: "TRQ-4460",
    brand: "Bulltorque",
    cat: "Transmisión",
    subcat: "Cajas y convertidores",
    compat: ["Mack Granite", "Volvo VHD"],
    desc: "Convertidor de torque reconstruido y probado en banco. Incluye bomba de carga revisada.",
    specs: [
      ["Tipo", "Una etapa"],
      ["Estrías", "23"],
      ["Prueba", "En banco"],
      ["Incluye", "Bomba de carga"],
    ],
    image: "/images/products/p6.webp",
  },
  {
    id: "p27",
    name: "Cruceta de cardán reforzada",
    part: "UJT-3315",
    brand: "PAI",
    cat: "Transmisión",
    subcat: "Crucetas y yugos",
    compat: ["Freightliner Cascadia", "Peterbilt 579"],
    desc: "Cruceta de acero forjado con rodamientos de agujas y grasera central para el árbol de transmisión.",
    specs: [
      ["Diámetro de muñón", "42 mm"],
      ["Largo entre tapas", "118 mm"],
      ["Engrase", "Con grasera"],
      ["Material", "Acero forjado"],
    ],
    image: "/images/products/p6.webp",
  },
  {
    id: "p28",
    name: "Retenedor de eje de salida",
    part: "RET-2040",
    brand: "National",
    cat: "Transmisión",
    subcat: "Retenedores",
    compat: ["Kenworth T680", "Mack Anthem"],
    desc: "Retenedor de doble labio con resorte para el eje de salida de la transmisión. Evita fugas de aceite en servicio severo.",
    specs: [
      ["Diámetro interior", "85 mm"],
      ["Diámetro exterior", "110 mm"],
      ["Espesor", "13 mm"],
      ["Material", "NBR con resorte"],
    ],
    image: "/images/products/p2.webp",
  },
  {
    id: "p29",
    name: "Disco de freno ventilado",
    part: "BRK-7120",
    brand: "Sampa",
    cat: "Frenos",
    subcat: "Discos y tambores",
    compat: ["Volvo VNR", "Freightliner M2 106"],
    desc: "Disco de freno ventilado rectificado para camión pesado. Balanceado y con acabado antióxido.",
    specs: [
      ["Diámetro", "340 mm"],
      ["Espesor", "32 mm"],
      ["Tipo", "Ventilado"],
      ["Perforaciones", "10"],
    ],
    image: "/images/products/p7.webp",
  },
  {
    id: "p30",
    name: "Compresor de aire de frenos",
    part: "AIR-6090",
    brand: "PAI",
    cat: "Frenos",
    subcat: "Compresores de aire",
    compat: ["Mack Pinnacle", "International LT"],
    desc: "Compresor monocilíndrico refrigerado por agua para el sistema neumático de frenos. Probado a caudal nominal.",
    specs: [
      ["Cilindros", "1"],
      ["Caudal", "360 L/min"],
      ["Refrigeración", "Por agua"],
      ["Accionamiento", "Por engranaje"],
    ],
    image: "/images/products/p13.webp",
  },
  {
    id: "p31",
    name: "Válvula de freno de pedal",
    part: "BVL-4410",
    brand: "Automann",
    cat: "Frenos",
    subcat: "Válvulas de freno",
    compat: ["Kenworth T880", "Peterbilt 389"],
    desc: "Válvula de pedal de doble circuito para el sistema de frenos hidráulico. Probada a presión de trabajo.",
    specs: [
      ["Tipo", "Doble circuito"],
      ["Presión", "210 bar"],
      ["Puertos", "4"],
      ["Accionamiento", "Pedal"],
    ],
    image: "/images/products/p15.webp",
  },
  {
    id: "p32",
    name: "Filtro de combustible en línea",
    part: "FLT-4180",
    brand: "Millard",
    cat: "Filtros",
    subcat: "Combustible",
    compat: ["Hino 338", "Isuzu NPR"],
    desc: "Filtro de combustible de alta eficiencia para la línea de alimentación. Protege la bomba y los inyectores.",
    specs: [
      ["Micraje", "5 µm"],
      ["Caudal", "200 L/h"],
      ["Rosca", "M14"],
      ["Cuerpo", "Metálico"],
    ],
    image: "/images/products/p5.webp",
  },
  {
    id: "p33",
    name: "Filtro de aire primario",
    part: "FLT-5210",
    brand: "Donaldson",
    cat: "Filtros",
    subcat: "Aire",
    compat: ["Freightliner Cascadia", "Kenworth T680"],
    desc: "Elemento primario de admisión con sello radial y medio filtrante de alta eficiencia para ambientes de polvo.",
    specs: [
      ["Eficiencia", "99.9 %"],
      ["Altura", "380 mm"],
      ["Diámetro exterior", "200 mm"],
      ["Sello", "Radial"],
    ],
    image: "/images/products/p4.webp",
  },
  {
    id: "p34",
    name: "Filtro hidráulico de retorno",
    part: "FLT-6640",
    brand: "Millard",
    cat: "Filtros",
    subcat: "Hidráulicos",
    compat: ["International 4300", "Mack Granite"],
    desc: "Filtro de retorno con válvula de derivación para el tanque hidráulico. Mantiene limpio el aceite del sistema.",
    specs: [
      ["Micraje", "10 µm"],
      ["Caudal", "250 L/min"],
      ["Bypass", "3.5 bar"],
      ["Montaje", "Roscado"],
    ],
    image: "/images/products/p4.webp",
  },
  {
    id: "p35",
    name: "Semieje trasero",
    part: "SEM-3380",
    brand: "PAI",
    cat: "Ejes y diferenciales",
    subcat: "Semiejes y flechas",
    compat: ["Volvo VHD", "Kenworth W900"],
    desc: "Semieje de eje motriz trasero, forjado y tratado, con brida y estriado según especificación de fábrica.",
    specs: [
      ["Estrías", "41"],
      ["Longitud", "1020 mm"],
      ["Material", "Acero forjado"],
      ["Brida", "8 pernos"],
    ],
    image: "/images/products/p16.webp",
  },
  {
    id: "p36",
    name: "Motor de arranque 24V",
    part: "STR-2490",
    brand: "Delco Remy",
    cat: "Eléctricos",
    subcat: "Arrancadores",
    compat: ["Mack Anthem", "Freightliner Cascadia"],
    desc: "Motor de arranque de alto par con solenoide incluido. Probado en banco antes del despacho.",
    specs: [
      ["Voltaje", "24 V"],
      ["Potencia", "5.5 kW"],
      ["Dientes de piñón", "11"],
      ["Rotación", "Horaria"],
    ],
    image: "/images/products/p9.webp",
  },
  {
    id: "p37",
    name: "Sensor de presión de aceite",
    part: "SEN-1180",
    brand: "Automann",
    cat: "Eléctricos",
    subcat: "Sensores",
    compat: ["Volvo VNL", "International LT"],
    desc: "Sensor de presión con salida analógica para el monitoreo del motor. Cuerpo sellado contra polvo y humedad.",
    specs: [
      ["Rango", "0 – 10 bar"],
      ["Señal", "0.5 – 4.5 V"],
      ["Rosca", "1/8 NPT"],
      ["Conector", "3 vías"],
    ],
    image: "/images/products/p11.webp",
  },
  {
    id: "p38",
    name: "Juego de cables de batería",
    part: "CBL-3320",
    brand: "Automann",
    cat: "Eléctricos",
    subcat: "Baterías y cables",
    compat: ["Peterbilt 579", "Kenworth T880"],
    desc: "Cables de fuerza con terminales de cobre estañado y aislamiento resistente al calor y al aceite.",
    specs: [
      ["Calibre", "2/0 AWG"],
      ["Largos", "1.2 m / 0.6 m"],
      ["Terminales", "Cobre estañado"],
      ["Aislamiento", "Hasta 105 °C"],
    ],
    image: "/images/products/p9.webp",
  },
  {
    id: "p39",
    name: "Faro de trabajo LED 48W",
    part: "LED-4890",
    brand: "Northstar",
    cat: "Eléctricos",
    subcat: "Iluminación",
    compat: ["Freightliner M2 106", "Hino 268"],
    desc: "Faro LED de haz combinado con carcasa de aluminio y lente de policarbonato. Resiste vibración y agua a presión.",
    specs: [
      ["Potencia", "48 W"],
      ["Voltaje", "10 – 30 V"],
      ["Flujo luminoso", "4300 lm"],
      ["Grado de protección", "IP68"],
    ],
    image: "/images/products/p9.webp",
  },
  {
    id: "p40",
    name: "Bomba de agua con polea",
    part: "WPU-5580",
    brand: "PAI",
    cat: "Refrigeración",
    subcat: "Bombas de agua",
    compat: ["Mack Granite", "Volvo VNR"],
    desc: "Bomba de agua completa con polea y empaques para el circuito de enfriamiento del motor.",
    specs: [
      ["Impulsor", "Metálico"],
      ["Sello", "Mecánico"],
      ["Polea", "Incluida"],
      ["Empaques", "Incluidos"],
    ],
    image: "/images/products/p13.webp",
  },
  {
    id: "p41",
    name: "Termostato de motor 82 °C",
    part: "THS-1082",
    brand: "GRC",
    cat: "Refrigeración",
    subcat: "Termostatos",
    compat: ["International ProStar", "Freightliner Columbia"],
    desc: "Termostato de cera con empaque incluido. Mantiene la temperatura de operación estable y reduce el consumo.",
    specs: [
      ["Apertura", "82 °C"],
      ["Apertura total", "95 °C"],
      ["Carrera", "8 mm"],
      ["Empaque", "Incluido"],
    ],
    image: "/images/products/p13.webp",
  },
  {
    id: "p42",
    name: "Manguera superior de radiador",
    part: "HOS-7740",
    brand: "GRC",
    cat: "Refrigeración",
    subcat: "Mangueras de radiador",
    compat: ["Kenworth T680", "Peterbilt 389"],
    desc: "Manguera moldeada de EPDM reforzado para la salida superior del radiador. Resiste alta temperatura y presión.",
    specs: [
      ["Material", "EPDM reforzado"],
      ["Diámetro interior", "60 mm"],
      ["Largo", "520 mm"],
      ["Temp. máx.", "130 °C"],
    ],
    image: "/images/products/p8.webp",
  },
  {
    id: "p43",
    name: "Aspa de ventilador 9 paletas",
    part: "FAN-9090",
    brand: "Bulltorque",
    cat: "Refrigeración",
    subcat: "Ventiladores",
    compat: ["Volvo VNL", "Mack Anthem"],
    desc: "Ventilador de poliamida reforzada, balanceado para trabajar con el embrague viscoso del motor.",
    specs: [
      ["Paletas", "9"],
      ["Diámetro", "700 mm"],
      ["Material", "Poliamida reforzada"],
      ["Montaje", "6 pernos"],
    ],
    image: "/images/products/p8.webp",
  },

  // Línea liviana (carros asiáticos y americanos): productos de ejemplo.
  {
    id: "p44",
    name: "Filtro de aceite roscado",
    part: "LFO-2510",
    brand: "Millard",
    cat: "Filtros",
    subcat: "Aceite",
    line: "liviano",
    compat: ["Pick-up diésel", "SUV", "Sedán"],
    desc: "Filtro de aceite roscado con válvula anti-drenaje para pickups y sedanes. Medio filtrante de alta retención.",
    specs: [
      ["Rosca", "3/4-16 UNF"],
      ["Altura", "85 mm"],
      ["Anti-drenaje", "Sí"],
      ["Presión de bypass", "1.0 bar"],
    ],
    image: "/images/products/p4.webp",
  },
  {
    id: "p45",
    name: "Filtro de aire tipo panel",
    part: "LAF-3320",
    brand: "Millard",
    cat: "Filtros",
    subcat: "Aire",
    line: "liviano",
    compat: ["Pick-up", "Sedán", "SUV"],
    desc: "Elemento de aire tipo panel con marco de poliuretano. Ajuste exacto a la caja de admisión del vehículo.",
    specs: [
      ["Tipo", "Panel"],
      ["Medidas", "245 × 185 × 32 mm"],
      ["Medio", "Papel plisado"],
      ["Sello", "Poliuretano"],
    ],
    image: "/images/products/p4.webp",
  },
  {
    id: "p46",
    name: "Filtro de combustible con trampa de agua",
    part: "LFF-4410",
    brand: "Donaldson",
    cat: "Filtros",
    subcat: "Combustible",
    line: "liviano",
    compat: ["Pick-up diésel", "SUV diésel"],
    desc: "Filtro de combustible para motor diésel liviano con vaso de purga y alojamiento para el sensor de agua.",
    specs: [
      ["Micraje", "8 µm"],
      ["Sensor de agua", "Compatible"],
      ["Rosca", "M20"],
      ["Caudal", "120 L/h"],
    ],
    image: "/images/products/p5.webp",
  },
  {
    id: "p47",
    name: "Manguera de radiador superior",
    part: "LHR-5205",
    brand: "GRC",
    cat: "Refrigeración",
    subcat: "Mangueras de radiador",
    line: "liviano",
    compat: ["Pick-up diésel", "SUV"],
    desc: "Manguera moldeada de EPDM para la salida superior del radiador. Curvatura y diámetros según el modelo.",
    specs: [
      ["Material", "EPDM"],
      ["Diámetro interior", "38 mm"],
      ["Largo", "430 mm"],
      ["Temp. máx.", "125 °C"],
    ],
    image: "/images/products/p8.webp",
  },
  {
    id: "p48",
    name: "Banda micro-V de accesorios",
    part: "LBT-6PK1875",
    brand: "S&S Power Up",
    cat: "Motor",
    subcat: "Bandas y tensores",
    line: "liviano",
    compat: ["SUV", "Sedán"],
    desc: "Banda de nervaduras múltiples para el arrastre de alternador, dirección y aire acondicionado.",
    specs: [
      ["Perfil", "6PK"],
      ["Longitud", "1875 mm"],
      ["Material", "EPDM"],
      ["Nervaduras", "6"],
    ],
    image: "/images/products/p13.webp",
  },
  {
    id: "p49",
    name: "Empaque de tapa de válvulas",
    part: "LGS-7130",
    brand: "SAP",
    cat: "Motor",
    subcat: "Empaques y sellos",
    line: "liviano",
    compat: ["Pick-up", "SUV"],
    desc: "Empaque de silicona para tapa de válvulas, con los sellos de pozo de bujía incluidos.",
    specs: [
      ["Material", "Silicona (VMQ)"],
      ["Incluye", "Sellos de bujía"],
      ["Reutilizable", "Sí"],
      ["Temp. máx.", "180 °C"],
    ],
    image: "/images/products/p2.webp",
  },
  {
    id: "p50",
    name: "Pastillas de freno delanteras cerámicas",
    part: "LBP-8240",
    brand: "SAP",
    cat: "Frenos",
    subcat: "Pastillas y fricciones",
    line: "liviano",
    compat: ["Pick-up", "Camioneta 4x4"],
    desc: "Juego de pastillas cerámicas de baja polución y frenado silencioso, con láminas antichirrido.",
    specs: [
      ["Material", "Cerámico"],
      ["Piezas", "4"],
      ["Espesor", "17 mm"],
      ["Láminas antichirrido", "Incluidas"],
    ],
    image: "/images/products/p7.webp",
  },
  {
    id: "p51",
    name: "Disco de freno delantero ventilado",
    part: "LBD-9310",
    brand: "SAP",
    cat: "Frenos",
    subcat: "Discos y tambores",
    line: "liviano",
    compat: ["Pick-up diésel", "SUV"],
    desc: "Disco ventilado con recubrimiento antióxido y balanceo de fábrica para pickup y SUV.",
    specs: [
      ["Diámetro", "319 mm"],
      ["Espesor", "28 mm"],
      ["Tipo", "Ventilado"],
      ["Perforaciones", "6"],
    ],
    image: "/images/products/p7.webp",
  },
  {
    id: "p52",
    name: "Alternador 12V 90A",
    part: "LAL-1290",
    brand: "Delco Remy",
    cat: "Eléctricos",
    subcat: "Alternadores",
    line: "liviano",
    compat: ["Pick-up", "Sedán", "SUV"],
    desc: "Alternador de 12 voltios con regulador integrado y polea de rueda libre. Probado en banco.",
    specs: [
      ["Voltaje", "12 V"],
      ["Amperaje", "90 A"],
      ["Polea", "6PK con rueda libre"],
      ["Regulador", "Integrado"],
    ],
    image: "/images/products/p9.webp",
  },
  {
    id: "p53",
    name: "Amortiguador delantero a gas",
    part: "LSA-3410",
    brand: "Monroe",
    cat: "Suspensión",
    subcat: "Amortiguadores",
    line: "liviano",
    compat: ["Pick-up diésel", "SUV"],
    desc: "Amortiguador bitubo presurizado con gas nitrógeno. Vástago cromado y bujes de montaje incluidos.",
    specs: [
      ["Tipo", "Bitubo a gas"],
      ["Posición", "Delantero"],
      ["Carrera", "180 mm"],
      ["Montaje", "Ojo / espiga"],
    ],
    image: "/images/products/p16.webp",
  },
  {
    id: "p54",
    name: "Rótula inferior de suspensión",
    part: "LSB-2260",
    brand: "Sampa",
    cat: "Suspensión",
    subcat: "Terminales y rótulas",
    line: "liviano",
    compat: ["Pick-up diésel", "SUV diésel"],
    desc: "Rótula inferior con perno cónico endurecido y guardapolvo. Engrasada de fábrica.",
    specs: [
      ["Tipo", "Rótula inferior"],
      ["Cono", "16 mm"],
      ["Rosca", "M12 × 1.25"],
      ["Guardapolvo", "Incluido"],
    ],
    image: "/images/products/p12.webp",
  },
  {
    id: "p55",
    name: "Juego de bujes de horquilla",
    part: "LSB-4480",
    brand: "ATRO",
    cat: "Suspensión",
    subcat: "Bujes",
    line: "liviano",
    compat: ["Pick-up", "Camioneta 4x4"],
    desc: "Bujes de poliuretano para horquilla inferior. Mayor duración que el caucho ante carga y calor.",
    specs: [
      ["Piezas", "4"],
      ["Material", "Poliuretano"],
      ["Diámetro interior", "14 mm"],
      ["Dureza", "80 Shore A"],
    ],
    image: "/images/products/p2.webp",
  },
  {
    id: "p56",
    name: "Resorte espiral trasero",
    part: "LSC-5150",
    brand: "Monroe",
    cat: "Suspensión",
    subcat: "Resortes y espirales",
    line: "liviano",
    compat: ["SUV", "Sedán"],
    desc: "Resorte helicoidal de acero al silicio con recubrimiento epóxico. Altura y carga según el modelo.",
    specs: [
      ["Posición", "Trasero"],
      ["Espiras", "6.5"],
      ["Alambre", "12.5 mm"],
      ["Altura libre", "380 mm"],
    ],
    image: "/images/products/p14.webp",
  },
  {
    id: "p57",
    name: "Aceite de motor sintético 5W-30",
    part: "LUB-5W30-4L",
    brand: "Enerlub",
    cat: "Lubricantes",
    subcat: "Aceites de motor",
    line: "liviano",
    compat: ["Sedán", "SUV", "Pick-up"],
    desc: "Aceite sintético para motores a gasolina de inyección directa. Protege en arranques en frío y tráfico pesado.",
    specs: [
      ["Viscosidad", "5W-30"],
      ["Norma", "API SN"],
      ["Tipo", "Sintético"],
      ["Presentación", "4 L"],
    ],
    image: "/images/products/p4.webp",
  },
  {
    id: "p58",
    name: "Grasa multipropósito de litio EP2",
    part: "LUB-EP2-1K",
    brand: "Enerlub",
    cat: "Lubricantes",
    subcat: "Grasas",
    line: "liviano",
    compat: ["Uso general"],
    desc: "Grasa de litio con aditivos de extrema presión para rodamientos, crucetas y puntos de chasis.",
    specs: [
      ["Espesante", "Litio"],
      ["Grado", "NLGI 2"],
      ["Temp. máx.", "130 °C"],
      ["Presentación", "1 kg"],
    ],
    image: "/images/products/p2.webp",
  },
  {
    id: "p59",
    name: "Refrigerante de larga duración 50/50",
    part: "LUB-OAT-1G",
    brand: "Enerlub",
    cat: "Lubricantes",
    subcat: "Refrigerantes",
    line: "liviano",
    compat: ["Uso general"],
    desc: "Refrigerante de tecnología orgánica listo para usar. Protege contra corrosión y cavitación del sistema.",
    specs: [
      ["Tecnología", "Orgánica (OAT)"],
      ["Dilución", "Listo para usar"],
      ["Punto de ebullición", "129 °C"],
      ["Presentación", "3.78 L"],
    ],
    image: "/images/products/p8.webp",
  },
  {
    id: "p60",
    name: "Aditivo limpiador de inyectores diésel",
    part: "LUB-ADD-300",
    brand: "Enerlub",
    cat: "Lubricantes",
    subcat: "Aditivos",
    line: "liviano",
    compat: ["Motores diésel livianos"],
    desc: "Aditivo de tanque que disuelve depósitos en inyectores y mejora la combustión del diésel.",
    specs: [
      ["Aplicación", "Diésel"],
      ["Dosificación", "300 ml / 60 L"],
      ["Compatible con DPF", "Sí"],
      ["Presentación", "300 ml"],
    ],
    image: "/images/products/p5.webp",
  },
];

export function getProduct(id: string): Product | undefined {
  return products.find((p) => p.id === id);
}

/** Búsqueda por nombre, N° de parte, marca, categoría o modelo compatible. */
export function searchProducts(query: string, category?: string): Product[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return products.filter((p) => {
    if (category && p.cat !== category) return false;
    return [p.name, p.part, p.brand, p.cat, p.subcat ?? "", p.compat.join(" ")]
      .join(" ")
      .toLowerCase()
      .includes(q);
  });
}

export function getProductImage(
  product: Pick<Product, "id"> & { image?: string }
): string {
  return product.image ?? `/images/products/${product.id}.webp`;
}

/**
 * Categorías del catálogo de equipo pesado. Las usa el mapa de iconos
 * (`categoryIcons` en components/icons.tsx), que espera exactamente estas 8 claves.
 */
export type CategoryKey =
  | "Motor"
  | "Hidráulica"
  | "Transmisión"
  | "Frenos"
  | "Filtros"
  | "Ejes y diferenciales"
  | "Eléctricos"
  | "Refrigeración";

/** Categorías que hoy solo aporta la línea liviana (aún sin icono propio). */
export type LightCategoryKey = "Suspensión" | "Lubricantes";

/** Todas las categorías del catálogo: equipo pesado + línea liviana. */
export type CatalogCategoryKey = CategoryKey | LightCategoryKey;

export const categoryCounts: Record<CatalogCategoryKey, number> = {
  Motor: 2140,
  Hidráulica: 3860,
  Transmisión: 1520,
  Frenos: 940,
  Filtros: 4210,
  "Ejes y diferenciales": 2780,
  Eléctricos: 1670,
  Refrigeración: 1130,
  Suspensión: 1480,
  Lubricantes: 860,
};

export const categoryOrder: CatalogCategoryKey[] = [
  "Motor",
  "Hidráulica",
  "Transmisión",
  "Frenos",
  "Filtros",
  "Ejes y diferenciales",
  "Eléctricos",
  "Refrigeración",
  "Suspensión",
  "Lubricantes",
];

/**
 * Subcategorías por categoría para el filtro del catálogo.
 * Es un listado provisional, hasta tener el oficial de CAVI.
 */
export const subcategories: Record<CatalogCategoryKey, string[]> = {
  Motor: [
    "Bloque y culatas",
    "Pistones y anillos",
    "Empaques y sellos",
    "Sistema de combustible",
    "Turbos",
    "Bombas de aceite y agua",
    "Bandas y tensores",
  ],
  Hidráulica: [
    "Bombas hidráulicas",
    "Cilindros",
    "Mangueras y acoples",
    "Válvulas",
    "Sellos hidráulicos",
  ],
  Transmisión: [
    "Cajas y convertidores",
    "Embragues",
    "Crucetas y yugos",
    "Retenedores",
  ],
  Frenos: [
    "Pastillas y fricciones",
    "Discos y tambores",
    "Compresores de aire",
    "Válvulas de freno",
  ],
  Filtros: ["Aceite", "Combustible", "Aire", "Hidráulicos", "Separadores de agua"],
  "Ejes y diferenciales": [
    "Coronas y piñones",
    "Mazas y baleros",
    "King pins y muñones",
    "Semiejes y flechas",
    "Diferenciales completos",
  ],
  Eléctricos: [
    "Alternadores",
    "Arrancadores",
    "Sensores",
    "Baterías y cables",
    "Iluminación",
  ],
  Refrigeración: [
    "Radiadores",
    "Bombas de agua",
    "Termostatos",
    "Mangueras de radiador",
    "Ventiladores",
  ],
  Suspensión: [
    "Amortiguadores",
    "Terminales y rótulas",
    "Bujes",
    "Resortes y espirales",
  ],
  Lubricantes: ["Aceites de motor", "Grasas", "Refrigerantes", "Aditivos"],
};

export function isCategoryKey(value: string): value is CatalogCategoryKey {
  return categoryOrder.some((key) => key === value);
}

export const categoryImages: Record<CatalogCategoryKey, string> = {
  Motor: "/images/products/p3.webp",
  Hidráulica: "/images/products/p1.webp",
  Transmisión: "/images/products/p6.webp",
  Frenos: "/images/products/p7.webp",
  Filtros: "/images/products/p4.webp",
  "Ejes y diferenciales": "/images/products/p13.webp",
  Eléctricos: "/images/products/p9.webp",
  Refrigeración: "/images/products/p8.webp",
  Suspensión: "/images/products/p16.webp",
  Lubricantes: "/images/products/p5.webp",
};

/**
 * Marcas presentes en el catálogo, derivadas de los productos para que el
 * filtro nunca se desincronice del inventario mostrado.
 */
export const catalogBrands: string[] = Array.from(
  new Set(products.map((p) => p.brand)),
).sort((a, b) => a.localeCompare(b, "es"));

/**
 * Marcas de repuestos que distribuye CAVI, para el carrusel "Marcas que distribuimos".
 * No confundir con `brands`: las marcas de maquinaria compatibles que usan los
 * filtros del catálogo.
 */
export const bannerBrands = [
  "AFA Industries",
  "Alphie",
  "ATRO",
  "Automann",
  "Bulltorque",
  "Delco Remy",
  "Donaldson",
  "Durun",
  "Eaton Fuller",
  "Enerlub",
  "FP Diesel",
  "Grand Rock",
  "GRC",
  "KTC Group",
  "Millard",
  "Monroe",
  "National",
  "Northstar",
  "PAI",
  "PowerHaus Diesel",
  "S&S Power Up",
  "Sampa",
  "SAP",
  "Universal Power",
  "Walker",
];

/**
 * Marcas de camión con las que los repuestos son compatibles, para la sección
 * "Nuestro enfoque" de /nosotros, en el orden de la presentación de CAVI.
 */
export const truckBrands = [
  "Mack",
  "Volvo",
  "Hino",
  "International",
  "Kenworth",
  "Freightliner",
  "Peterbilt",
  "Isuzu",
];

/**
 * Marcas de motor de "Cobertura de marcas" en el inicio. Son las que indicó
 * CAVI: no agregar otras sin su confirmación.
 */
export const engineBrands = ["Caterpillar", "Cummins", "Detroit Diesel"];

export const brandLogos: Record<string, string> = {
  Volvo: "/images/brands/volvo.svg",
  Donaldson: "/images/brands/donaldson.svg",
  // Marcas de camión de "Nuestro enfoque"; Volvo usa el mismo logo de arriba.
  Mack: "/images/brands/mack.svg",
  Hino: "/images/brands/hino.svg",
  International: "/images/brands/international.svg",
  Kenworth: "/images/brands/kenworth.svg",
  Freightliner: "/images/brands/freightliner.svg",
  Peterbilt: "/images/brands/peterbilt.svg",
  Isuzu: "/images/brands/isuzu.svg",
  // Marcas del carrusel del hero: PNG con transparencia o fondo blanco, de
  // 450x160 como máximo. Se muestran sobre una tarjeta blanca: no usar logos claros.
  "AFA Industries": "/images/brands/afa-industries.png",
  Durun: "/images/brands/durun.png",
  "Eaton Fuller": "/images/brands/eaton-fuller.png",
  "KTC Group": "/images/brands/ktc-group.png",
  "Universal Power": "/images/brands/universal-power.png",
  Alphie: "/images/brands/alphie.png",
  ATRO: "/images/brands/atro.png",
  Automann: "/images/brands/automann.png",
  Bulltorque: "/images/brands/bulltorque.png",
  "Delco Remy": "/images/brands/delco-remy.png",
  Enerlub: "/images/brands/enerlub.png",
  "FP Diesel": "/images/brands/fp-diesel.png",
  "Grand Rock": "/images/brands/grand-rock.png",
  GRC: "/images/brands/grc.png",
  Millard: "/images/brands/millard.png",
  Monroe: "/images/brands/monroe.png",
  National: "/images/brands/national.png",
  Northstar: "/images/brands/northstar.png",
  PAI: "/images/brands/pai.png",
  "PowerHaus Diesel": "/images/brands/powerhaus-diesel.png",
  "S&S Power Up": "/images/brands/ss-power-up.png",
  Sampa: "/images/brands/sampa.png",
  SAP: "/images/brands/sap.png",
  Walker: "/images/brands/walker.png",
};

export function getBrandLogo(name: string): string | undefined {
  return brandLogos[name];
}

export const siteImages = {
  heroParts: "/images/site/hero-parts.webp",
};

export const steps = [
  {
    n: "1",
    title: "Busca tu repuesto",
    text: "Por número de parte, categoría o modelo de tu máquina.",
  },
  {
    n: "2",
    title: "Agrega a solicitud",
    text: "Suma las piezas y cantidades que necesitas, sin precios.",
  },
  {
    n: "3",
    title: "Completa tus datos",
    text: "Un formulario corto de contacto y entrega, sin pago en línea.",
  },
  {
    n: "4",
    title: "Recibe tu cotización",
    text: "Te enviamos precio, disponibilidad y tiempo de entrega.",
  },
];

/** Cantidad con separador de miles en español. */
export function formatCount(n: number): string {
  return n.toLocaleString("es");
}
