// Datos de la empresa: contacto, sucursales, historia, misión, visión y valores.

export const company = {
  name: "Repuestos CAVI",
  foundedYear: 1997,
  tagline: "Tu aliado en repuestos para camiones y equipo pesado",
  // Razón social y RTN a cuyo nombre están las cuentas bancarias.
  legalName: "Grupo HMC S.A.",
  rtn: "18049019107850",
  email: "marketing@repcavi.com",
  // El primero es el principal: recibe los botones de WhatsApp (flotante,
  // cotización, portal) y se muestra primero en la barra superior y el footer.
  whatsapp: [
    { label: "+504 3176-0933", href: "https://wa.me/50431760933" },
    { label: "+504 9460-0488", href: "https://wa.me/50494600488" },
  ],
  social: {
    facebook: "https://www.facebook.com/share/14khkWSPfJM/?mibextid=LQQJ4d",
    instagram:
      "https://www.instagram.com/repuestoscavi?igsh=aXp1cjI4MjYwbHg3",
    tiktok:
      "https://www.tiktok.com/@repuestos.cavi?_r=1&_t=ZS-97gCoWqOGBU",
  },
};

export type Branch = {
  city: string;
  name: string;
  address: string;
  maps: string;
  /** Búsqueda exacta para el mapa incrustado (nombre del negocio + Plus Code). */
  mapQuery: string;
  /** Foto de la fachada, con el nombre y la dirección visibles. */
  photo: string;
  isHQ?: boolean;
};

export const branches: Branch[] = [
  {
    city: "San Pedro Sula",
    name: "Casa Matriz",
    address:
      "Avenida Juan Pablo II, 9 y 10 Calle N.E., Barrio Morazán, San Pedro Sula.",
    maps: "https://maps.app.goo.gl/98UiuRAKjBErgFzQ8",
    mapQuery: "GX6Q+P57 Repuestos Cavi, San Pedro Sula, Cortés",
    photo: "/images/branches/san-pedro-sula.webp",
    isHQ: true,
  },
  {
    city: "El Progreso, Yoro",
    name: "Sucursal El Progreso",
    address:
      "Barrio Subirana, 1 y 2 Ave., 4 Calle, atrás del Gimnasio Municipal de El Progreso, Yoro.",
    maps: "https://maps.app.goo.gl/QFePBmVRy83BC6Ro8",
    mapQuery: "C53Q+CV7 Repuestos Cavi, El Progreso, Yoro",
    photo: "/images/branches/el-progreso.webp",
  },
  {
    city: "Puerto Cortés",
    name: "Sucursal El Porvenir",
    address:
      "Carretera hacia Omoa, km 7, frente a las canchas de fútbol El Arenal, Barrio El Porvenir, Puerto Cortés.",
    maps: "https://maps.app.goo.gl/heo83NfA4PNiaLKKA",
    mapQuery: "R3CF+C28 Repuestos CAVI, Puerto Cortés, Cortés",
    photo: "/images/branches/puerto-cortes.webp",
  },
  {
    city: "Tegucigalpa",
    name: "Sucursal La Laguna",
    address:
      "Colonia La Laguna, frente al retorno de Mall Premier, carretera a Olancho, Comayagüela, D.C.",
    maps: "https://maps.app.goo.gl/ZHEjFB1vyqxvAP9N7",
    mapQuery: "4Q49+86C Repuestos Cavi La Laguna, Comayagüela, Francisco Morazán",
    photo: "/images/branches/la-laguna.webp",
  },
  {
    city: "Tegucigalpa",
    name: "Sucursal La Cañada",
    address:
      "Colonia La Cañada, 2 Anillo Periférico, 100 metros adelante del retorno, frente a gasolinera Texaco Nuevo Mundo, Tegucigalpa.",
    maps: "https://maps.app.goo.gl/BzySGUQkW3WefcoH8",
    mapQuery:
      "Repuestos CAVI La Cañada, 2 Anillo Periférico, Tegucigalpa, Francisco Morazán",
    photo: "/images/branches/la-canada.webp",
  },
];

export const focus =
  "En Repuestos CAVI nos enfocamos en la comercialización de repuestos para camiones de las principales marcas del transporte pesado, garantizando compatibilidad, calidad y respaldo.";

export const history =
  "En Repuestos CAVI nos enorgullece llevar más de dos décadas dedicados a la venta de repuestos para equipo pesado, brindando calidad y confianza a nuestros clientes desde el primer día. Fundada en septiembre de 1997 en El Progreso, Yoro, donde abrimos nuestra primera tienda. Hoy nuestra casa matriz opera en San Pedro Sula y atendemos todo el país con 5 sucursales, creciendo constantemente para servir mejor a nuestros clientes.";

export const mission =
  "Proveer soluciones innovadoras y confiables en equipo pesado, superando las expectativas de nuestros clientes mediante productos y servicios de alta calidad. Nos comprometemos a brindar una atención personalizada y un servicio logístico eficiente, manteniendo un enfoque inquebrantable en la excelencia y la satisfacción del cliente.";

export const vision =
  "Convertirnos en el referente indiscutible del sector de equipo pesado en Centroamérica, destacando por nuestra innovación, eficiencia operativa y compromiso con el desarrollo sostenible. Buscamos ser reconocidos como líderes en soluciones integrales, impulsando el crecimiento y la competitividad de nuestros clientes en la región.";

export const values = [
  {
    title: "Integridad",
    text: "Actuamos con honestidad, responsabilidad y transparencia en cada gestión.",
  },
  {
    title: "Compromiso",
    text: "Trabajamos para brindar soluciones oportunas a nuestros clientes.",
  },
  {
    title: "Calidad",
    text: "Ofrecemos repuestos confiables para el sector de equipo pesado.",
  },
  {
    title: "Servicio",
    text: "Atendemos con rapidez, respeto y disposición para resolver cada necesidad.",
  },
  {
    title: "Trabajo en equipo",
    text: "Colaboramos entre sucursales para brindar una mejor experiencia.",
  },
];
