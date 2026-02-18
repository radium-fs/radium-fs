interface PropItem {
  name: string;
  type: string;
  desc: string;
  required?: boolean;
}

interface PropsTableProps {
  items: PropItem[];
}

export function PropsTable({ items }: PropsTableProps) {
  return (
    <div className="my-4 overflow-x-auto not-prose">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b-2 border-border">
            <th className="text-left py-2 px-3 text-text-primary font-semibold">Property</th>
            <th className="text-left py-2 px-3 text-text-primary font-semibold">Type</th>
            <th className="text-left py-2 px-3 text-text-primary font-semibold">Description</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.name} className="border-b border-border">
              <td className="py-2 px-3 font-mono text-xs text-accent">
                {item.name}
                {item.required === false && (
                  <span className="text-text-secondary ml-1">?</span>
                )}
              </td>
              <td className="py-2 px-3 font-mono text-xs text-text-secondary">
                {item.type}
              </td>
              <td className="py-2 px-3 text-text-secondary text-xs">
                {item.desc}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
