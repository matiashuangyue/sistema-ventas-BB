import { useEffect, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { API_URL as API } from "../../config/api";

async function obtenerDashboard({ desde = "", hasta = "" } = {}) {
  const params = new URLSearchParams();
  if (desde) params.append("desde", desde);
  if (hasta) params.append("hasta", hasta);

  const res = await fetch(`${API}/reportes/dashboard?${params.toString()}`);
  return res.json();
}

export default function Reportes() {
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelado = false;

    async function cargarReporteInicial() {
      try {
        setLoading(true);
        const result = await obtenerDashboard();

        if (!cancelado) {
          setData(result);
        }
      } catch (error) {
        console.error(error);
      } finally {
        if (!cancelado) {
          setLoading(false);
        }
      }
    }

    cargarReporteInicial();

    return () => {
      cancelado = true;
    };
  }, []);

  async function cargarReportes() {
    try {
      setLoading(true);
      const result = await obtenerDashboard({ desde, hasta });
      setData(result);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  function descargarReportePDF() {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.setTextColor(37, 99, 235);
    doc.text("B&B Distribuidora - Reporte", 14, 15);
    
    autoTable(doc, {
      startY: 25,
      head: [["Métrica", "Valor"]],
      body: [
        ["Recaudación Total", `$${data.resumen.total.toLocaleString()}`],
        ["Ventas Realizadas", data.resumen.cantidad.toString()],
        ["Ticket Promedio", `$${Math.round(data.resumen.promedio).toLocaleString()}`],
      ],
      headStyles: { fillColor: [37, 99, 235] }
    });

    doc.save(`reporte-${desde || 'total'}.pdf`);
  }

  return (
    <div style={styles.container}>
      {/* CABECERA RESPONSIVE */}
      <div style={styles.headerFlex}>
        <h2 style={styles.title}>Reportes</h2>
        {data && (
          <button style={styles.btnPdf} onClick={descargarReportePDF}>
            PDF
          </button>
        )}
      </div>

      {/* BLOQUE FILTROS ADAPTADO */}
      <div style={styles.bloque}>
        <div style={styles.filtrosGrid}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Desde</label>
            <input type="date" style={styles.input} value={desde} onChange={(e) => setDesde(e.target.value)} />
          </div>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Hasta</label>
            <input type="date" style={styles.input} value={hasta} onChange={(e) => setHasta(e.target.value)} />
          </div>
        </div>
        <button style={styles.btnPrincipalFull} onClick={cargarReportes}>
          Actualizar Reporte
        </button>
      </div>

      {loading ? (
        <div style={styles.empty}>Cargando...</div>
      ) : data && (
        <>
          {/* TARJETAS RESPONSIVE (1 col en celu, 3 en PC) */}
          <div style={styles.gridCards}>
            <div style={styles.card}>
              <span style={styles.cardLabel}>Recaudación</span>
              <strong style={styles.cardValue}>${data.resumen.total.toLocaleString()}</strong>
            </div>
            <div style={styles.card}>
              <span style={styles.cardLabel}>Ventas</span>
              <strong style={styles.cardValue}>{data.resumen.cantidad}</strong>
            </div>
            <div style={styles.card}>
              <span style={styles.cardLabel}>Promedio</span>
              <strong style={{...styles.cardValue, color: 'var(--primary)'}}>${Math.round(data.resumen.promedio).toLocaleString()}</strong>
            </div>
          </div>

          {/* RANKING PRODUCTOS */}
          <div style={styles.bloque}>
            <h3 style={styles.subTitle}>Top Productos</h3>
            {data.topProductos.map((p, i) => (
              <div key={i} style={styles.filaRanking}>
                <div style={{flex: 1}}>
                  <div style={styles.prodNombre}>{p.nombre}</div>
                  <div style={styles.prodSub}>{p.cantidad} unid.</div>
                </div>
                <div style={styles.montoRanking}>${p.total.toLocaleString()}</div>
              </div>
            ))}
          </div>

          {/* RANKING CLIENTES */}
          <div style={styles.bloque}>
            <h3 style={styles.subTitle}>Top Clientes</h3>
            {data.rankingClientes.map((c, i) => (
              <div key={i} style={styles.filaRanking}>
                <div style={{display: 'flex', alignItems: 'center', flex: 1}}>
                  <span style={styles.badge}>{i + 1}</span>
                  <span style={styles.prodNombre}>{c.nombre}</span>
                </div>
                <div style={styles.montoRanking}>${c.total.toLocaleString()}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const styles = {
  container: { display: "flex", flexDirection: "column", gap: 12, paddingBottom: 20 },
  headerFlex: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  title: { margin: 0, fontSize: 20 },
  bloque: { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 12 },
  
  // Filtros: se adaptan a 1 columna en móvil si el ancho es poco
  filtrosGrid: { 
    display: "grid", 
    gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", 
    gap: 10,
    marginBottom: 12
  },
  inputGroup: { display: 'flex', flexDirection: 'column' },
  label: { fontSize: 13, marginBottom: 4, color: "var(--text-soft)", fontWeight: '500' },
  input: { padding: 10, borderRadius: 8, border: "1px solid var(--border-strong)", fontSize: 14 },
  
  btnPrincipalFull: { 
    width: '100%', border: "none", borderRadius: 8, background: "var(--primary)", 
    color: "var(--text-inverse)", padding: "12px", fontWeight: 600, cursor: 'pointer' 
  },
  btnPdf: { background: 'var(--surface)', border: '1px solid var(--border-strong)', padding: '8px 12px', borderRadius: 8 },

  // Tarjetas: En celu ocupan todo el ancho, en tablet/PC se ponen de a 3
  gridCards: { 
    display: "grid", 
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
    gap: 10 
  },
  card: { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 16 },
  cardLabel: { fontSize: 11, color: "var(--text-muted)", textTransform: 'uppercase', letterSpacing: '0.5px' },
  cardValue: { fontSize: 18, color: "var(--text)", fontWeight: 800, display: 'block', marginTop: 4 },

  subTitle: { margin: "0 0 10px 0", fontSize: 15, color: 'var(--text-soft)', fontWeight: '700' },
  filaRanking: { 
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
    padding: '10px 0', borderBottom: '1px solid var(--border-subtle)' 
  },
  prodNombre: { fontSize: 14, fontWeight: '600', color: 'var(--text)' },
  prodSub: { fontSize: 12, color: 'var(--text-muted)' },
  montoRanking: { fontWeight: '700', color: 'var(--success)', fontSize: 14, marginLeft: 10 },
  badge: { background: 'var(--surface-muted)', padding: '2px 6px', borderRadius: 4, fontSize: 10, marginRight: 8, color: 'var(--text-soft)' },
  empty: { textAlign: 'center', padding: 20, color: 'var(--text-muted)' }
};
