// Auto-generated from states_rows.csv — do not edit manually
export const BRAZIL_STATES: Record<string, { nome: string; sigla: string }> = {
  "0a82a5ef-c12d-4701-898c-1b83faa8dbac": {
    "nome": "Sergipe",
    "sigla": "SE"
  },
  "1a6da1d5-b1f0-4464-a4d6-57a1ac6b2af5": {
    "nome": "Rio de Janeiro",
    "sigla": "RJ"
  },
  "1dd037c6-e39d-482d-a1dc-f941034573c8": {
    "nome": "Rio Grande do Sul",
    "sigla": "RS"
  },
  "1e98f7b6-8a3a-4b66-8009-28b7cfb725c2": {
    "nome": "Rondônia",
    "sigla": "RO"
  },
  "299f9746-3596-46b3-9b50-462e85568361": {
    "nome": "Tocantins",
    "sigla": "TO"
  },
  "2c68c99a-6414-4659-b16b-46dafd3fdadb": {
    "nome": "Rio Grande do Norte",
    "sigla": "RN"
  },
  "2d7d3f58-3f11-44c0-bc4f-23c1f4dc60f8": {
    "nome": "Distrito Federal",
    "sigla": "DF"
  },
  "4a9d24c0-d8b3-48bb-9867-568f95549188": {
    "nome": "Amapá",
    "sigla": "AP"
  },
  "52d72551-e44b-4330-a5a3-010d35bbf7f3": {
    "nome": "Mato Grosso",
    "sigla": "MT"
  },
  "79fe1254-8cbb-4ea0-ac04-a9643484f3a9": {
    "nome": "Bahia",
    "sigla": "BA"
  },
  "99408cf2-fa74-496d-a4ae-42100cd71627": {
    "nome": "Ceará",
    "sigla": "CE"
  },
  "9a03c845-0640-45d8-a127-4e75c6199596": {
    "nome": "Acre",
    "sigla": "AC"
  },
  "a07c2f7f-d123-4ca6-96c2-1d647658741d": {
    "nome": "Alagoas",
    "sigla": "AL"
  },
  "a3693c11-a57c-49aa-9432-ef468a55bf01": {
    "nome": "Goiás",
    "sigla": "GO"
  },
  "ab156ec4-5563-4d90-96a4-a82d89a6119b": {
    "nome": "Maranhão",
    "sigla": "MA"
  },
  "aeec9799-d290-4a42-882a-457ed3d24299": {
    "nome": "Minas Gerais",
    "sigla": "MG"
  },
  "b9745a33-28a2-41ff-a407-b7e48a816a2f": {
    "nome": "Pará",
    "sigla": "PA"
  },
  "bd0002d5-a6d5-4269-998f-c970d917b163": {
    "nome": "Paraíba",
    "sigla": "PB"
  },
  "c12ed39f-0960-46bd-83b9-a51e865c1985": {
    "nome": "Paraná",
    "sigla": "PR"
  },
  "c1e45ae4-7402-47b7-be63-b8ca099de84b": {
    "nome": "Piauí",
    "sigla": "PI"
  },
  "c308324f-507c-4ae1-b8c0-a2ec50f94599": {
    "nome": "São Paulo",
    "sigla": "SP"
  },
  "cba11647-b2a6-4f80-8399-0479450ba2da": {
    "nome": "Espírito Santo",
    "sigla": "ES"
  },
  "cd05c5c6-36b1-416b-ae6b-a0aad3851a68": {
    "nome": "Mato Grosso do Sul",
    "sigla": "MS"
  },
  "d5541160-cc89-417c-a43b-d7b31aa22dc1": {
    "nome": "Amazonas",
    "sigla": "AM"
  },
  "d87e3e0f-28cf-4de6-a723-7359d82d6cde": {
    "nome": "Santa Catarina",
    "sigla": "SC"
  },
  "d9ff3829-8497-47c9-ad56-c06433dc17d9": {
    "nome": "Roraima",
    "sigla": "RR"
  },
  "e5f775ce-6025-42cf-b934-2105730b93b0": {
    "nome": "Pernambuco",
    "sigla": "PE"
  }
};

export function getStateSigla(stateId: string): string | null {
  return BRAZIL_STATES[stateId]?.sigla ?? null;
}

export function getStateNome(stateId: string): string | null {
  return BRAZIL_STATES[stateId]?.nome ?? null;
}

export const STATES_LIST = Object.entries(BRAZIL_STATES)
  .map(([id, s]) => ({ id, ...s }))
  .sort((a, b) => a.sigla.localeCompare(b.sigla));
