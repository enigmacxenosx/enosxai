const DIMENSIONS = 96;
function vectorize(text) {
  const vector = new Array(DIMENSIONS).fill(0);
  const tokens = text.trim().toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  for (const token of tokens) {
    let hash = 2166136261;
    for (let i = 0; i < token.length; i += 1) { hash ^= token.charCodeAt(i); hash = Math.imul(hash, 16777619); }
    const slot = Math.abs(hash) % DIMENSIONS;
    vector[slot] += 1;
    if (token.length > 3) vector[(slot + token.length) % DIMENSIONS] += 0.35;
  }
  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  return magnitude ? vector.map((value) => value / magnitude) : vector;
}
function cosine(a, b) { return a.reduce((sum, value, index) => sum + value * b[index], 0); }
const source = vectorize("ENOSX is a local-first offline AI knowledge bank");
const related = vectorize("offline local AI knowledge retrieval");
const unrelated = vectorize("banana orchard weather forecast");
const norm = Math.sqrt(cosine(source, source));
if (source.length !== DIMENSIONS) throw new Error("wrong dimensions");
if (Math.abs(norm - 1) > 1e-8) throw new Error("vector is not normalized");
if (cosine(source, related) <= cosine(source, unrelated)) throw new Error("related retrieval did not rank first");
console.log(JSON.stringify({ dimensions: source.length, normalized: norm, relatedScore: cosine(source, related), unrelatedScore: cosine(source, unrelated) }, null, 2));
