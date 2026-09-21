from pathlib import Path
p = Path('/home/ubuntu/faj2ni/client/src/pages/Admin.tsx')
s = p.read_text()
s = s.replace('const [salePrice, setSalePrice] = useState(0); const [costs', 'const [salePrice, setSalePrice] = useState(0); const [deliveryFils, setDeliveryFils] = useState(0); const [costs')
s = s.replace('setSalePrice(data.salePriceFils); setCosts({', 'setSalePrice(data.salePriceFils); setDeliveryFils(data.deliveryFils); setCosts({')
s = s.replace('saveFinance.mutate({ id, salePriceFils: salePrice, deliveryFils: data.deliveryFils, ...costs, items })', 'saveFinance.mutate({ id, salePriceFils: salePrice, deliveryFils, ...costs, items })')
s = s.replace('<div className="field"><label>سعر البيع (د.أ)</label><input type="number" value={salePrice / 1000} onChange={event => setSalePrice(Number(event.target.value) * 1000)} /></div>', '<div className="field"><label>سعر البيع (د.أ)</label><input type="number" value={salePrice / 1000} onChange={event => setSalePrice(Number(event.target.value) * 1000)} /></div><div className="field"><label>سعر التوصيل (د.أ)</label><input type="number" value={deliveryFils / 1000} onChange={event => setDeliveryFils(Number(event.target.value) * 1000)} /></div>')
p.write_text(s)
