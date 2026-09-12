function Rodape({ className = '' }) {
  const ano = new Date().getFullYear()

  return (
    <p className={`text-center text-xs text-ink/40 ${className}`}>
      Desenvolvido por Arlison Lopes — {ano}. Todos os direitos reservados.
    </p>
  )
}

export default Rodape
