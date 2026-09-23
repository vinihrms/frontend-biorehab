import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import {
  AlertCircle,
  ArrowRight,
  FlaskConical,
  LoaderCircle,
  X,
} from "lucide-react";
import { ApiError } from "../lib/api";
import { statusLabels, type Status } from "../domain/types";
import { useWrite } from "../lib/query";

export function Brand() {
  return (
    <span className="brand">
      <span className="brand-icon">
        <FlaskConical size={21} />
      </span>
      <span>
        Rehab<span className="text-teal-700">DATA</span>
      </span>
    </span>
  );
}
export function PageTitle({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">BIOREHAB LAB / REHABDATA</p>
        <h1>{title}</h1>
        {description && <p className="muted mt-2">{description}</p>}
      </div>
      <div className="actions">{actions}</div>
    </div>
  );
}
export function ErrorNotice({ error }: { error: unknown }) {
  if (!error) return null;
  return (
    <div role="alert" className="notice error">
      <AlertCircle size={19} />
      <div>
        {error instanceof Error ? error.message : "Ocorreu um erro inesperado."}
        {error instanceof ApiError &&
          error.details?.map((d, i) => (
            <p key={i}>
              {d.field}: {d.message}
            </p>
          ))}
      </div>
    </div>
  );
}
export function Empty({
  title = "Nenhum registro encontrado",
  children,
}: {
  title?: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <FlaskConical size={28} />
      </span>
      <h3>{title}</h3>
      <p className="muted">
        {children || "Os registros aparecerão aqui quando forem cadastrados."}
      </p>
    </div>
  );
}
export function QueryState({
  query,
  children,
}: {
  query: { isPending: boolean; error: unknown; refetch: () => unknown };
  children: ReactNode;
}) {
  if (query.isPending)
    return (
      <div className="loading" role="status">
        <LoaderCircle className="animate-spin" /> Carregando informações…
      </div>
    );
  if (query.error)
    return (
      <>
        <ErrorNotice error={query.error} />
        <button className="btn secondary" onClick={() => query.refetch()}>
          Tentar novamente
        </button>
      </>
    );
  return children;
}
export function Badge({ status }: { status: Status }) {
  return (
    <span className={`badge status-${status}`}>
      <span className="status-dot" />
      {statusLabels[status]}
    </span>
  );
}
export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    ref.current?.showModal();
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = old;
    };
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby={id}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className="modal"
    >
      <div className="modal-heading">
        <h2 id={id}>{title}</h2>
        <button className="icon-btn" aria-label="Fechar" onClick={onClose}>
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export interface Field {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  help?: string;
  options?: { value: string; label: string }[];
  step?: string;
  disabled?: boolean;
  autoComplete?: string;
}
export function SchemaForm({
  fields,
  schema,
  initial = {},
  onSubmit,
  submitLabel = "Salvar",
  onCancel,
}: {
  fields: Field[];
  schema: z.ZodType;
  initial?: Record<string, string>;
  onSubmit: (values: Record<string, string>) => Promise<unknown>;
  submitLabel?: string;
  onCancel?: () => void;
}) {
  const id = useId();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<Record<string, string>>({
    resolver: zodResolver(schema as z.ZodObject) as Resolver<
      Record<string, string>
    >,
    defaultValues: Object.fromEntries(
      fields.map((f) => [f.name, initial[f.name] ?? ""]),
    ),
  });
  const [error, setFailure] = useState<unknown>(null);
  return (
    <form
      noValidate
      onSubmit={handleSubmit(async (values) => {
        setFailure(null);
        try {
          await onSubmit(values);
        } catch (e) {
          setFailure(e);
          if (e instanceof ApiError)
            e.details?.forEach((d) => {
              if (fields.some((f) => f.name === d.field))
                setError(d.field, { message: d.message });
            });
        }
      })}
    >
      <div className="form-fields">
        {fields.map((field) => (
          <div className="field" key={field.name}>
            <label htmlFor={`${id}-${field.name}`}>{field.label}</label>
            {field.type === "select" ? (
              <select
                id={`${id}-${field.name}`}
                {...register(field.name)}
                aria-invalid={!!errors[field.name]}
                aria-describedby={`${id}-${field.name}-hint`}
                disabled={field.disabled || isSubmitting}
              >
                <option value="">Selecione…</option>
                {field.options?.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            ) : field.type === "textarea" ? (
              <textarea
                id={`${id}-${field.name}`}
                rows={3}
                {...register(field.name)}
                aria-invalid={!!errors[field.name]}
                aria-describedby={`${id}-${field.name}-hint`}
                disabled={isSubmitting}
              />
            ) : (
              <input
                id={`${id}-${field.name}`}
                type={field.type || "text"}
                placeholder={field.placeholder}
                step={field.step}
                autoComplete={field.autoComplete}
                {...register(field.name)}
                aria-invalid={!!errors[field.name]}
                aria-describedby={`${id}-${field.name}-hint`}
                disabled={field.disabled || isSubmitting}
              />
            )}
            <span
              id={`${id}-${field.name}-hint`}
              className={errors[field.name] ? "field-error" : "field-help"}
            >
              {String(errors[field.name]?.message || field.help || "")}
            </span>
          </div>
        ))}
      </div>
      <ErrorNotice error={error} />
      <div className="form-actions">
        {onCancel && (
          <button
            type="button"
            className="btn secondary"
            disabled={isSubmitting}
            onClick={onCancel}
          >
            Cancelar
          </button>
        )}
        <button className="btn" disabled={isSubmitting}>
          {isSubmitting ? (
            <LoaderCircle size={17} className="animate-spin" />
          ) : null}
          {submitLabel}
          {!isSubmitting && <ArrowRight size={16} />}
        </button>
      </div>
    </form>
  );
}
export function ConfirmAction({
  path,
  method = "DELETE",
  label = "Excluir",
  description = "O registro será enviado para os excluídos e poderá ser restaurado.",
  onDone,
}: {
  path: string;
  method?: string;
  label?: string;
  description?: string;
  onDone?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const mutation = useWrite();
  return (
    <>
      <button
        className={`btn small ${method === "DELETE" ? "danger-ghost" : "secondary"}`}
        onClick={() => {
          mutation.reset();
          setOpen(true);
        }}
      >
        {label}
      </button>
      {open && (
        <Modal
          title={`${label} registro`}
          onClose={() => {
            if (!mutation.isPending) setOpen(false);
          }}
        >
          <p className="muted">{description}</p>
          <ErrorNotice error={mutation.error} />
          <div className="form-actions">
            <button
              className="btn secondary"
              disabled={mutation.isPending}
              onClick={() => setOpen(false)}
            >
              Cancelar
            </button>
            <button
              className={`btn ${method === "DELETE" ? "danger" : ""}`}
              disabled={mutation.isPending}
              onClick={() =>
                mutation.mutate(
                  { path, method },
                  {
                    onSuccess: () => {
                      setOpen(false);
                      onDone?.();
                    },
                  },
                )
              }
            >
              {mutation.isPending ? "Processando…" : label}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
