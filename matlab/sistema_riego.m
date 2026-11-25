%% SISTEMA DE RIEGO INTELIGENTE - Lógica difusa Mamdani
% Mismas variables, conjuntos y reglas que src/sistema/reglasDifusas.js.
% Requiere Fuzzy Logic Toolbox (MATLAB R2018b o superior).
% Configuración por defecto de mamfis: AND = min, implicación = min,
% agregación = max, defuzzificación = centroide (101 puntos), igual que la app web.

clear; clc;

%% ===================== SISTEMA 1: URGENCIA DE RIEGO =====================
fis = mamfis('Name', 'urgencia_riego');

fis = addInput(fis, [0 150], 'Name', 'lluvia');            % mm/mes
fis = addMF(fis, 'lluvia', 'trapmf', [0 0 20 50],     'Name', 'baja');
fis = addMF(fis, 'lluvia', 'trimf',  [30 70 110],     'Name', 'media');
fis = addMF(fis, 'lluvia', 'trapmf', [90 120 150 150],'Name', 'alta');

fis = addInput(fis, [5 35], 'Name', 'temperatura');         % °C
fis = addMF(fis, 'temperatura', 'trapmf', [5 5 10 16],   'Name', 'fria');
fis = addMF(fis, 'temperatura', 'trimf',  [12 19 26],    'Name', 'templada');
fis = addMF(fis, 'temperatura', 'trapmf', [22 28 35 35], 'Name', 'calida');

fis = addInput(fis, [0 100], 'Name', 'humedad_suelo');      % %
fis = addMF(fis, 'humedad_suelo', 'trapmf', [0 0 20 40],     'Name', 'seca');
fis = addMF(fis, 'humedad_suelo', 'trimf',  [30 50 70],      'Name', 'adecuada');
fis = addMF(fis, 'humedad_suelo', 'trapmf', [60 80 100 100], 'Name', 'saturada');

fis = addInput(fis, [0 10], 'Name', 'sensibilidad');        % 0-10
fis = addMF(fis, 'sensibilidad', 'trapmf', [0 0 2 5],   'Name', 'baja');
fis = addMF(fis, 'sensibilidad', 'trimf',  [3 5 7],     'Name', 'media');
fis = addMF(fis, 'sensibilidad', 'trapmf', [5 8 10 10], 'Name', 'alta');

fis = addOutput(fis, [0 100], 'Name', 'urgencia');
fis = addMF(fis, 'urgencia', 'trapmf', [0 0 10 25],     'Name', 'muy_baja');
fis = addMF(fis, 'urgencia', 'trimf',  [15 30 45],      'Name', 'baja');
fis = addMF(fis, 'urgencia', 'trimf',  [35 50 65],      'Name', 'media');
fis = addMF(fis, 'urgencia', 'trimf',  [55 70 85],      'Name', 'alta');
fis = addMF(fis, 'urgencia', 'trapmf', [75 90 100 100], 'Name', 'muy_alta');

reglas = [
  "If humedad_suelo is saturada then urgencia is muy_baja"
  "If humedad_suelo is seca and lluvia is baja and temperatura is calida then urgencia is muy_alta"
  "If humedad_suelo is seca and lluvia is baja and temperatura is templada then urgencia is alta"
  "If humedad_suelo is seca and lluvia is baja and temperatura is fria then urgencia is media"
  "If humedad_suelo is seca and lluvia is media then urgencia is alta"
  "If humedad_suelo is seca and lluvia is alta then urgencia is media"
  "If humedad_suelo is adecuada and lluvia is baja and temperatura is calida then urgencia is alta"
  "If humedad_suelo is adecuada and lluvia is baja and temperatura is templada then urgencia is media"
  "If humedad_suelo is adecuada and lluvia is baja and temperatura is fria then urgencia is baja"
  "If humedad_suelo is adecuada and lluvia is media then urgencia is baja"
  "If humedad_suelo is adecuada and lluvia is alta then urgencia is muy_baja"
  "If sensibilidad is alta and humedad_suelo is seca then urgencia is muy_alta"
  "If sensibilidad is alta and humedad_suelo is adecuada and temperatura is calida then urgencia is alta"
  "If sensibilidad is alta and humedad_suelo is adecuada then urgencia is media"
  "If sensibilidad is media and humedad_suelo is seca then urgencia is alta"
  "If sensibilidad is baja and humedad_suelo is adecuada then urgencia is muy_baja"
  "If sensibilidad is baja and humedad_suelo is seca and lluvia is baja then urgencia is media"
];
fis = addRule(fis, reglas);

%% ===================== SISTEMA 2: PÉRDIDA EN CANALES =====================
% revestimiento: tierra = 2, mampostería = 5, tubería = 9
fisP = mamfis('Name', 'perdida_canal');

fisP = addInput(fisP, [5 35], 'Name', 'temperatura');
fisP = addMF(fisP, 'temperatura', 'trapmf', [5 5 10 16],   'Name', 'fria');
fisP = addMF(fisP, 'temperatura', 'trimf',  [12 19 26],    'Name', 'templada');
fisP = addMF(fisP, 'temperatura', 'trapmf', [22 28 35 35], 'Name', 'calida');

fisP = addInput(fisP, [0 10], 'Name', 'revestimiento');
fisP = addMF(fisP, 'revestimiento', 'trapmf', [0 0 2 4],   'Name', 'tierra');
fisP = addMF(fisP, 'revestimiento', 'trimf',  [3 5 7],     'Name', 'mamposteria');
fisP = addMF(fisP, 'revestimiento', 'trapmf', [6 8 10 10], 'Name', 'tuberia');

fisP = addOutput(fisP, [0 6], 'Name', 'tasa_perdida');       % % cada 100 m
fisP = addMF(fisP, 'tasa_perdida', 'trapmf', [0 0 0.2 0.6],   'Name', 'minima');
fisP = addMF(fisP, 'tasa_perdida', 'trimf',  [0.4 1.2 2],     'Name', 'baja');
fisP = addMF(fisP, 'tasa_perdida', 'trimf',  [1.5 2.5 3.5],   'Name', 'media');
fisP = addMF(fisP, 'tasa_perdida', 'trimf',  [3 4 5],         'Name', 'alta');
fisP = addMF(fisP, 'tasa_perdida', 'trapmf', [4.5 5.5 6 6],   'Name', 'muy_alta');

reglasP = [
  "If revestimiento is tuberia then tasa_perdida is minima"
  "If revestimiento is mamposteria and temperatura is fria then tasa_perdida is baja"
  "If revestimiento is mamposteria and temperatura is templada then tasa_perdida is baja"
  "If revestimiento is mamposteria and temperatura is calida then tasa_perdida is media"
  "If revestimiento is tierra and temperatura is fria then tasa_perdida is media"
  "If revestimiento is tierra and temperatura is templada then tasa_perdida is alta"
  "If revestimiento is tierra and temperatura is calida then tasa_perdida is muy_alta"
];
fisP = addRule(fisP, reglasP);

%% ===================== LOS 3 ESCENARIOS =====================
% Parcela de ejemplo: P9 (papa, sensibilidad 7, humedad base 33 %)
%            lluvia  temp  humedad  sensibilidad
escenarios = [  8     29     21        7 ;   % Época seca con El Niño (33 - 12)
               45     21     33        7 ;   % Época de transición
              130     24     68        7 ];  % Época de lluvias (33 + 35)
nombres = ["Seca con El Niño", "Transición", "Lluvias"];

fprintf('Urgencia de riego de P9 (Papa)\n');
for i = 1:3
    u = evalfis(fis, escenarios(i, :));
    fprintf('  %-18s -> %6.2f\n', nombres(i), u);
end

fprintf('\nTasa de pérdida (%% cada 100 m) con 29 °C\n');
fprintf('  Tierra       -> %5.2f\n', evalfis(fisP, [29 2]));
fprintf('  Mampostería  -> %5.2f\n', evalfis(fisP, [29 5]));
fprintf('  Tubería      -> %5.2f\n', evalfis(fisP, [29 9]));

% Valores que calcula la app web con las mismas reglas (deberían coincidir):
%   Urgencia P9: seca 90.85 | transición 66.78 | lluvias 28.00
%   Pérdida a 29 °C: tierra 5.47 | mampostería 2.50 | tubería 0.20

%% Gráficas (opcional)
% figure; plotmf(fis, 'input', 3); title('Humedad del suelo');
% figure; plotmf(fis, 'output', 1); title('Urgencia');
% figure; gensurf(fis, [3 2]); title('Superficie: humedad vs temperatura');
% fuzzyLogicDesigner(fis)   % abre el editor gráfico
