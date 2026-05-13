export function parseLabelWithBrackets(name: string) {
  const parts = name.split(/(\[.*?\])/g);

  return parts.map((part, i) => {
    if (part.startsWith('[') && part.endsWith(']')) {
      return (
        <span key={i} style={{ color: '#898989', fontSize: '0.85em' }}>
          {part}
        </span>
      );
    }
    return <span key={i}>{part.trim() ? part : null}</span>;
  });
}

// extrai ['Epic-05', 'RNF-04'] do nome
export function extractTagsFromName(name: string): string[] {
  const matches = name.match(/\[([^\]]+)\]/g) ?? [];
  return matches.map(m => m.slice(1, -1));
}