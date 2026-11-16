# Contexto compartido — Pauleta Canaria

Este directorio es una **capa de conocimiento** para Codex y ChatGPT; no contiene configuración ejecutable, secretos ni instrucciones para modificar sistemas en producción.

## Documentos
- [Empresa y producto](empresa-y-producto.md): actividad, catálogo documentado, precios de referencia y canales.
- [Decisiones y criterios](decisiones-y-criterios.md): normas de trabajo, marca y decisiones comunicadas.
- [Requisitos e incidencias de la aplicación](app-requisitos.md): expectativas de producto que deben contrastarse con el código.
- [Antecedentes históricos](antecedentes-historicos.md): costes, distribución, Zumit, talleres y limitaciones de las fuentes.
- [Sincronización](sincronizacion.md): cómo incorporar decisiones entre ChatGPT, GitHub y Codex.

## Calidad y vigencia
Compilado el **16-11-2026** a partir del contexto del proyecto Pauleta Canaria, documentos de octubre de 2026 y conversaciones recientes. No es una exportación exhaustiva de todas las conversaciones ni reemplaza las facturas, contratos o el ERP.

**Prioridad recomendada:** indicaciones directas recientes del usuario > evidencia primaria vigente > documentos fechados > análisis históricos > propuestas de asistentes. Cuando haya conflicto, mostrarlo y pedir una decisión antes de aplicar cambios reales.

**Estado técnico inicial informado por Codex (16-11-2026):** repositorio `jonaypc/pauleta-dashboard`, rama `main`, commit `109fbefba7fa3b2174d4c543d830fb42564369bc`; Vercel producía ese commit en la fecha de la revisión. La carpeta local recuperada se clonó por HTTPS; la carpeta anterior del escritorio permanece como respaldo. Verificar de nuevo antes de actuar.

## Relación con documentos técnicos anteriores
`CLAUDE.md` y `README.md` se mantienen por trazabilidad y contienen referencias históricas. La actualización documental de esta rama aclara el IGIC no universal, catálogos fechados, rutas de PDF y que la versión del escritorio anterior no es la referencia del código. No se han cambiado cálculos, defaults de impuestos, datos de facturas ni el comportamiento de la aplicación.
