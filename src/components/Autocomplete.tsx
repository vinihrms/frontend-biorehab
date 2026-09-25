import { useId, useMemo, useState } from "react";

export const normalizeSearch = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim();

export interface SearchOption {
  value: string;
  label: string;
  description?: string;
}

export function Autocomplete({
  id,
  options,
  value,
  onChange,
  onBlur,
  disabled,
  invalid,
  describedBy,
}: {
  id: string;
  options: SearchOption[];
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
}) {
  const listId = useId();
  const [text, setText] = useState(
    options.find((o) => o.value === value)?.label || "",
  );
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const needle = normalizeSearch(text);
  const matches = useMemo(
    () =>
      needle.length < 2
        ? []
        : options.filter((o) => normalizeSearch(o.label).includes(needle)),
    [needle, options],
  );
  const visible = matches.slice(0, 20);
  const expanded = open && needle.length >= 2;
  const choose = (option: SearchOption) => {
    onChange(option.value);
    setText(option.label);
    setOpen(false);
    setActive(-1);
  };
  return (
    <div className="autocomplete">
      <input
        id={id}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={expanded}
        aria-controls={expanded ? listId : undefined}
        aria-activedescendant={
          expanded && visible[active] ? `${listId}-${active}` : undefined
        }
        aria-invalid={invalid}
        aria-describedby={describedBy}
        autoComplete="off"
        disabled={disabled}
        placeholder="Digite pelo menos 2 caracteres do nome…"
        value={text}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          setOpen(false);
          onBlur();
        }}
        onChange={(e) => {
          setText(e.target.value);
          onChange("");
          setOpen(true);
          setActive(-1);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            setOpen(true);
            setActive((i) =>
              visible.length
                ? (i + (e.key === "ArrowDown" ? 1 : -1) + visible.length) %
                  visible.length
                : -1,
            );
          }
          if (e.key === "Enter" && expanded) {
            e.preventDefault();
            if (visible[active]) choose(visible[active]);
          }
          if (e.key === "Escape" && open) {
            e.preventDefault();
            e.stopPropagation();
            setOpen(false);
          }
        }}
      />
      {expanded && (
        <>
          <ul
            id={listId}
            role="listbox"
            aria-label="Resultados da busca"
            className="autocomplete-options"
          >
            {visible.map((o, i) => (
              <li
                id={`${listId}-${i}`}
                key={o.value}
                role="option"
                aria-label={
                  o.description ? `${o.label} ${o.description}` : o.label
                }
                aria-selected={value === o.value}
                className={active === i ? "highlighted" : ""}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(o)}
              >
                <strong>{o.label}</strong>
                {o.description && <small>{o.description}</small>}
              </li>
            ))}
          </ul>
          <p role="status" className="field-help">
            {matches.length === 0
              ? "Nenhum resultado encontrado."
              : matches.length > 20
                ? "Mostrando 20 resultados. Digite mais caracteres para refinar."
                : `${matches.length} resultado(s). Use as setas e Enter para selecionar.`}
          </p>
        </>
      )}
      {value && (
        <p className="field-help">
          Selecionado: {options.find((o) => o.value === value)?.label}
          {options.find((o) => o.value === value)?.description
            ? ` — ${options.find((o) => o.value === value)?.description}`
            : ""}
        </p>
      )}
    </div>
  );
}
