// ============================================================================
// Utilidades compartidas: nombres de meses, formato de moneda, choices de
// los distintos campos (los mismos que teníamos como "choices" en los
// modelos de Django), y algunas cuentas de fechas.
// ============================================================================

window.Utils = {
    MESES_ES: [
        '', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
    ],

    TIPO_CHOICES: [
        { value: 'ingreso', label: 'Ingreso' },
        { value: 'gasto', label: 'Gasto' },
    ],

    PAYMENT_TYPE_CHOICES: [
        { value: '', label: '— Sin especificar —' },
        { value: 'efectivo', label: 'Efectivo' },
        { value: 'debito', label: 'Tarjeta débito' },
        { value: 'credito', label: 'Tarjeta crédito' },
        { value: 'transferencia', label: 'Transferencia' },
        { value: 'otro', label: 'Otro' },
    ],

    NECESSITY_CHOICES: [
        { value: '', label: '— Sin especificar —' },
        { value: 'necesario', label: 'Necesario' },
        { value: 'antojo', label: 'Antojo' },
    ],

    DEBT_TYPE_CHOICES: [
        { value: 'tarjeta_credito', label: 'Tarjeta de crédito' },
        { value: 'prestamo', label: 'Préstamo' },
        { value: 'otro', label: 'Otro' },
    ],

    DEBT_MOVEMENT_CHOICES: [
        { value: 'cargo', label: 'Cargo / consumo' },
        { value: 'pago', label: 'Pago' },
    ],

    // Busca la etiqueta legible de un choice a partir de su value.
    // Es el equivalente a get_FOO_display() de Django.
    labelFor(choices, value) {
        const found = choices.find((c) => c.value === value);
        return found ? found.label : value || '—';
    },

    formatMoney(amount) {
        const n = Number(amount || 0);
        return '$' + n.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    },

    // Cantidad de días de un mes (1-12).
    daysInMonth(year, month) {
        return new Date(year, month, 0).getDate();
    },

    todayISO() {
        const d = new Date();
        return d.toISOString().slice(0, 10);
    },

    // "2026-09-15" -> "15/09/2026"
    formatDate(isoDate) {
        if (!isoDate) return '—';
        const [y, m, d] = isoDate.split('-');
        return `${d}/${m}/${y}`;
    },

    sum(items, pick) {
        return items.reduce((acc, item) => acc + Number(pick(item) || 0), 0);
    },
};
