// Dirección del backend. Si no se define VITE_API_URL se usa la misma máquina desde la que se
// abrió la app, en el puerto 8000: en la PC es localhost y desde un celular conectado a la
// misma red WiFi es la IP de la PC (por ejemplo http://192.168.0.10:8000).
export const API_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:8000`;
