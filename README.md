# Seguimiento de Préstamo — Caja Popular Mexicana

Una herramienta web interactiva y responsiva diseñada para simular, calcular y llevar un registro detallado de las tablas de amortización de préstamos, adaptada a las lógicas financieras habituales de la Caja Popular Mexicana.

<img width="1423" height="1680" alt="image" src="https://github.com/user-attachments/assets/8369db35-98a6-49c2-8a0e-f2a6dd10b3e1" />

## 🚀 Características

- **Dos esquemas de pago:** Soporta planes de **Amortización Igual** (Capital fijo) y **Pago Fijo Mensual** (Fórmula PMT).
- **Cálculo de Impuestos:** Desglosa de forma automática el interés y el IVA sobre el interés (16% por defecto).
- **Regla de Pago Mínimo:** Integra un validador que asegura una cuota mínima mensual de **$3,360.00 con IVA** si aún queda saldo pendiente por amortizar.
- **Registro y Control de Pagos Realizados:** Permite capturar abonos reales introduciendo la fecha y el monto para recalcular dinámicamente el saldo e identificar si pagaste de más o de menos.
- **Persistencia Local:** Los pagos se guardan de forma automática en el navegador a través de `localStorage`.
- **Respaldo de Datos:** Opciones para exportar e importar tu historial de pagos y configuración en archivos estructurados `.json`.
- **Diseño Adaptable (Responsive):** Interfaz limpia, moderna y optimizada tanto para escritorio como para dispositivos móviles.

## 🛠️ Tecnologías utilizadas

- **HTML5** (Estructura semántica)
- **CSS3** (Variables nativas, diseño Grid y Flexbox, fuentes de Google Fonts)
- **JavaScript** (Lógica vanilla sin dependencias ni frameworks externos)

## 📦 Instalación y Uso

Al tratarse de una aplicación *client-side* pura, no requiere de servidores, bases de datos ni dependencias de Node.js.

1. Clona este repositorio o descarga el archivo `calculadora_cpm.html`.
2. Haz doble clic sobre el archivo `calculadora_cpm.html` para abrirlo en cualquier navegador web moderno (Chrome, Edge, Firefox, Safari).
3. ¡Comienza a gestionar y proyectar tu préstamo!

## ⚙️ Reglas de Negocio Incorporadas

La calculadora cuenta con un motor de amortización inteligente que ejecuta las siguientes acciones:
* **Corte de Interés:** El abono ingresado primero cubre el Interés + IVA devengados del periodo; el remanente se destina directamente a reducir el capital principal.
* **Alertas de Desviación:** Si el total acumulado de tus pagos reales difiere del plan de pagos original, la interfaz despliega un bloque de alerta indicando el monto exacto extra o restante.
