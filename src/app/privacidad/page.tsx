import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-bold text-ink-900">Privacidad</h1>
      <div className="mt-6 space-y-4 text-sm leading-6 text-ink-600">
        <p>
          CRM Rosa Reina trata datos de clientes, contactos, conversaciones y documentos comerciales para uso interno.
        </p>
        <p>
          Los datos criticos como tarifas, pedidos, contratos, condiciones especiales o identificadores fiscales se
          almacenan en areas privadas y no deben alimentar el RAG publico.
        </p>
        <p>
          El canal WhatsApp debe derivar cualquier solicitud de precio, presupuesto, pedido, cantidad para cotizar o
          plazo comprometido al equipo de administracion.
        </p>
      </div>
      <Link href="/dashboard" className="mt-8 inline-flex text-sm font-semibold text-rose-700">
        Volver al CRM
      </Link>
    </main>
  );
}
