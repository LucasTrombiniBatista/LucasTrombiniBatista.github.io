// Busca o calendário de contribuições via GraphQL e grava apenas dados públicos em data/github.json.
// Roda só dentro da GitHub Action: o token nunca chega ao navegador.
import { mkdirSync, writeFileSync } from "node:fs";

const token = process.env.GH_STATS_TOKEN;
const login = process.env.GH_LOGIN;
if (!token || !login) throw new Error("GH_STATS_TOKEN e GH_LOGIN são obrigatórios");

const query = `query($login: String!) {
  user(login: $login) {
    repositories(privacy: PUBLIC, ownerAffiliations: OWNER) { totalCount }
    contributionsCollection {
      contributionCalendar {
        totalContributions
        weeks { contributionDays { date contributionCount contributionLevel } }
      }
    }
  }
}`;

const res = await fetch("https://api.github.com/graphql", {
  method: "POST",
  headers: { Authorization: `bearer ${token}`, "Content-Type": "application/json", "User-Agent": "portfolio-stats" },
  body: JSON.stringify({ query, variables: { login } }),
});
if (!res.ok) throw new Error(`GraphQL HTTP ${res.status}`);
const { data, errors } = await res.json();
if (errors || !data?.user) throw new Error("Resposta GraphQL inválida");

const LEVELS = { NONE: 0, FIRST_QUARTILE: 1, SECOND_QUARTILE: 2, THIRD_QUARTILE: 3, FOURTH_QUARTILE: 4 };
const cal = data.user.contributionsCollection.contributionCalendar;
const days = cal.weeks.flatMap((w) => w.contributionDays).map((d) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.date) || !Number.isInteger(d.contributionCount)) throw new Error("Dia inválido");
  return [d.date, d.contributionCount, LEVELS[d.contributionLevel] ?? 0];
});
if (days.length < 300) throw new Error("Calendário incompleto");

const out = {
  login,
  publicRepos: data.user.repositories.totalCount,
  total: cal.totalContributions,
  days,
};
mkdirSync("data", { recursive: true });
writeFileSync("data/github.json", JSON.stringify(out) + "\n");
console.log(`OK: ${days.length} dias, ${out.total} contribuições`);
