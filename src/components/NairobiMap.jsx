import { useState } from 'react';
import { Map, Marker, Popup } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { SEVERITY, severityOf, tivSize, kes, NAIROBI_CENTER, NAIROBI_BOUNDS } from '../utils';

const STYLE = {
  version: 8,
  sources: { osm: { type: 'raster', tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize: 256, attribution: '© OpenStreetMap contributors' } },
  layers: [{ id: 'osm', type: 'raster', source: 'osm', paint: { 'raster-opacity': 0.55, 'raster-saturation': -0.8 } }],
};

// hotspots: coloured areas. buildings (results page only): dots sized by TIV.
export default function NairobiMap({ hotspots = [], buildings = [] }) {
  const [picked, setPicked] = useState(null);

  return (
    <Map initialViewState={NAIROBI_CENTER} maxBounds={NAIROBI_BOUNDS} minZoom={9.5} maxZoom={16} mapStyle={STYLE} onClick={() => setPicked(null)}>
      {hotspots.map((h) => {
        const color = SEVERITY[severityOf(h)];
        const big = buildings.length ? 40 : 26;
        return (
          <Marker key={`h${h.id}`} longitude={h.lon} latitude={h.lat} onClick={(e) => { e.originalEvent.stopPropagation(); setPicked({ kind: 'hotspot', ...h }); }}>
            <div className="hotspot" style={{ width: big, height: big, background: color + '66', borderColor: color }} />
          </Marker>
        );
      })}
      {buildings.map((b) => {
        const s = tivSize(b.tiv_kes);
        return (
          <Marker key={b.loc_id} longitude={b.lon} latitude={b.lat} onClick={(e) => { e.originalEvent.stopPropagation(); setPicked({ kind: 'building', ...b }); }}>
            <div className="building" style={{ width: s, height: s }} />
          </Marker>
        );
      })}
      {picked && (
        <Popup longitude={picked.lon} latitude={picked.lat} offset={14} closeButton={false} onClose={() => setPicked(null)}>
          {picked.kind === 'hotspot' ? (
            <div className="pop"><b>{picked.name || `Hotspot ${picked.id}`}</b><span>{severityOf(picked)} risk</span></div>
          ) : (
            <div className="pop">
              <b>{picked.loc_id}</b>
              <span>Lat {Number(picked.lat).toFixed(5)}, Long {Number(picked.lon).toFixed(5)}</span>
              <span>TIV {kes(picked.tiv_kes, false)}</span>
              {picked.loss_kes != null && <span>Loss {kes(picked.loss_kes, false)}</span>}
            </div>
          )}
        </Popup>
      )}
    </Map>
  );
}
