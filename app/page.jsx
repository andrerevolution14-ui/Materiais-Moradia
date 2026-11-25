import './session.css';
export const metadata = {title: 'Domaine XXV · Materiais'};
export default function Page() {
  return <div className="page"><div className="wrap" style={{maxWidth:560,paddingTop:'18vh'}}>
    <div className="box">
      <h2>DOMAINE <i>XXV</i></h2>
      <p className="muted">Escolha de materiais da moradia em Oliveirinha, Aveiro.</p>
      <p className="muted">Cada cliente tem um endereço pessoal, enviado pelo consultor, por exemplo <b>/nome</b>. Abra esse endereço para ver a moradia em 3D e escolher os materiais.</p>
    </div>
    <p className="muted"><a href="/admin">Área do consultor</a></p>
  </div></div>;
}
