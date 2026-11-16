# Flujo de sincronización ChatGPT — GitHub — Codex

No existe sincronización automática de memoria ni conversaciones entre ChatGPT y Codex. GitHub aloja **documentación compartida y versionada**, no acceso directo al historial de ChatGPT.

1. Se analiza un asunto en ChatGPT; se distingue propuesta de decisión confirmada.
2. Solo con autorización explícita del usuario, se prepara una actualización documental en una rama de GitHub.
3. El usuario revisa el diff/PR; una vez aprobado, se integra en `main` por el procedimiento autorizado.
4. Codex sincroniza la carpeta local con GitHub y lee `AGENTS.md` y `docs/contexto-pauleta/` antes de intervenir.
5. Los cambios técnicos se hacen separadamente, se prueban y solo se despliegan con autorización.
6. Los hallazgos en Codex que afectan decisiones de negocio deben volver a documentarse como evidencia con fecha, no convertirse en hechos por suposición.

No guardar en GitHub extractos bancarios, nóminas, documentos personales, secretos ni contenido de terceros sin la revisión pertinente. Mantener referencias a los originales sin copiarlos innecesariamente. No mezclar archivos de otras empresas.
