import assert from "node:assert/strict";
import { test } from "node:test";
import {
  calcularPrecioItem,
  calcularSubtotalVenta,
  normalizarAumento,
  obtenerPrecioAplicado,
} from "../src/pages/ventas/preciosVenta.js";

function variante(id, precio, escalas = []) {
  return { id, precios: [{ cantidadMinima: 1, precio }, ...escalas] };
}

function item(varianteId, cantidad = 1, precioEditado = null) {
  return { varianteId, cantidad, precioEditado };
}

test("un único porcentaje aumenta cada precio unitario y suma los renglones", () => {
  const variantes = [variante(1, 100), variante(2, 200)];
  const carrito = [item(1, 2), item(2, 3)];
  const primero = calcularPrecioItem(carrito[0], variantes[0], "10");
  const segundo = calcularPrecioItem(carrito[1], variantes[1], "10");
  assert.equal(primero.precioBase, 100);
  assert.equal(primero.precioLista, 100);
  assert.equal(primero.precioUnitario, 110);
  assert.equal(primero.subtotal, 220);
  assert.equal(segundo.precioUnitario, 220);
  assert.equal(segundo.subtotal, 660);
  assert.equal(calcularSubtotalVenta(carrito, variantes, "10"), 880);
  assert.ok(primero.valido && segundo.valido);
});

test("redondea el precio por unidad antes de multiplicar y sumar, con porcentajes fraccionarios", () => {
  const variantes = [variante(1, 0.05), variante(2, 1.15)];
  const carrito = [item(1, 3), item(2, 3)];
  assert.equal(calcularPrecioItem(carrito[0], variantes[0], 10).precioUnitario, 0.06);
  assert.equal(calcularPrecioItem(carrito[0], variantes[0], 10).subtotal, 0.18);
  assert.equal(calcularPrecioItem(carrito[1], variantes[1], 10).precioUnitario, 1.27);
  assert.equal(calcularSubtotalVenta(carrito, variantes, 10), 3.99);
  const fraccionario = calcularPrecioItem(item(3, 3), variante(3, 5.55), "12.5");
  assert.equal(fraccionario.precioUnitario, 6.24);
  assert.equal(fraccionario.subtotal, 18.72);
});

test("cambiar o quitar el aumento recalcula desde la base sin acumular porcentajes", () => {
  const producto = variante(1, 100);
  const linea = item(1, 2);
  assert.equal(calcularPrecioItem(linea, producto, 10).precioUnitario, 110);
  assert.equal(calcularPrecioItem(linea, producto, 20).precioUnitario, 120);
  assert.equal(calcularPrecioItem(linea, producto, 20).precioUnitario, 120);
  assert.equal(calcularPrecioItem(linea, producto, 0).precioUnitario, 100);
  assert.equal(calcularPrecioItem(linea, producto).subtotal, 200);
  assert.equal(calcularPrecioItem(linea, producto, "").precioUnitario, 100);
});

test("los productos agregados después reciben el mismo aumento vigente", () => {
  const variantes = [variante(1, 100), variante(2, 40)];
  const carrito = [item(1, 2)];
  assert.equal(calcularSubtotalVenta(carrito, variantes, 25), 250);
  const ampliado = [...carrito, item(2, 3)];
  assert.equal(calcularPrecioItem(ampliado[1], variantes[1], 25).precioUnitario, 50);
  assert.equal(calcularSubtotalVenta(ampliado, variantes, 25), 400);
});

test("cambiar la cantidad aplica el aumento a la escala de lista correspondiente", () => {
  const producto = variante(1, 100, [
    { cantidadMinima: 12, precio: 70 },
    { cantidadMinima: 6, precio: 80 },
  ]);
  assert.deepEqual(obtenerPrecioAplicado(producto, 5), { precioUnitario: 100, cantidadMinima: 1 });
  assert.equal(calcularPrecioItem(item(1, 5), producto, 10).subtotal, 550);
  const seis = calcularPrecioItem(item(1, 6), producto, 10);
  assert.equal(seis.cantidadMinima, 6);
  assert.equal(seis.precioUnitario, 88);
  assert.equal(seis.subtotal, 528);
  assert.equal(calcularPrecioItem(item(1, 12), producto, 10).precioUnitario, 77);
  assert.equal(calcularPrecioItem(item(1, 1), producto, 10).precioUnitario, 110);
});

test("el precio especial es la base del aumento y se conserva al quitarlo, incluido cero", () => {
  const producto = variante(1, 100, [{ cantidadMinima: 6, precio: 80 }]);
  const especial = calcularPrecioItem(item(1, 6, 50), producto, 10);
  assert.equal(especial.precioLista, 80);
  assert.equal(especial.precioBase, 50);
  assert.equal(especial.precioUnitario, 55);
  assert.equal(especial.subtotal, 330);
  assert.equal(calcularPrecioItem(item(1, 6, 50), producto, 0).precioUnitario, 50);
  assert.equal(calcularPrecioItem(item(1, 6), producto, 10).precioUnitario, 88);
  const gratis = calcularPrecioItem(item(1, 3, 0), producto, 25);
  assert.equal(gratis.precioUnitario, 0);
  assert.equal(gratis.subtotal, 0);
  assert.equal(gratis.valido, true);
});

test("el cálculo no cambia la lista, sus escalas ni los precios base del borrador", () => {
  const variantes = [variante(1, 100, [{ cantidadMinima: 6, precio: 80 }]), variante(2, 200)];
  const carrito = [item(1, 6), item(2, 2, 150)];
  const original = structuredClone({ variantes, carrito });
  for (const porcentaje of [10, 25, 0, 12.5]) {
    calcularSubtotalVenta(carrito, variantes, porcentaje);
    carrito.forEach((linea, indice) => calcularPrecioItem(linea, variantes[indice], porcentaje));
  }
  assert.deepEqual({ variantes, carrito }, original);
});

test("admite porcentaje cero, entrada vacía y aumentos mayores al 100 por ciento", () => {
  assert.equal(normalizarAumento(), 0);
  assert.equal(normalizarAumento(""), 0);
  assert.equal(normalizarAumento("0"), 0);
  assert.equal(normalizarAumento("12.5"), 12.5);
  const aumentado = calcularPrecioItem(item(1, 2), variante(1, 100), 150);
  assert.equal(aumentado.precioUnitario, 250);
  assert.equal(aumentado.subtotal, 500);
  assert.equal(aumentado.valido, true);
});

test("porcentajes inválidos no producen un precio válido para confirmar", () => {
  for (const porcentaje of [-1, "-0.01", NaN, Infinity, -Infinity, "Infinity", "abc", null, true, false, [], [10], {}]) {
    assert.equal(normalizarAumento(porcentaje), null);
    const calculado = calcularPrecioItem(item(1), variante(1, 100), porcentaje);
    assert.equal(calculado.valido, false);
    assert.ok(Number.isNaN(calculado.precioUnitario));
  }
});

test("detecta desbordamientos del precio o del renglón y bases inválidas", () => {
  for (const [linea, producto, porcentaje] of [
    [item(1), variante(1, 1000), Number.MAX_VALUE],
    [item(1, Number.MAX_SAFE_INTEGER), variante(1, 100), 10],
    [item(1, 1, -10), variante(1, 100), 10],
    [item(1, 1, Infinity), variante(1, 100), 10],
    [item(1, 1, NaN), variante(1, 100), 10],
    [item(1), variante(1, Number.MAX_SAFE_INTEGER), 0],
  ]) {
    assert.equal(calcularPrecioItem(linea, producto, porcentaje).valido, false);
  }
});
