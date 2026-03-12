// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ZEPTO_API_KEY = Deno.env.get('ZEPTO_API_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { atleta_email, parceiro_nome, parceiro_categoria, codigo, data_resgate } = await req.json();

    const dataFormatada = new Date(data_resgate ?? Date.now()).toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; color: #111827;">
        <div style="background: linear-gradient(135deg, #00C896, #00A87C); padding: 28px 32px; border-radius: 12px 12px 0 0;">
          <div style="font-size: 22px; font-weight: 900; color: #fff; letter-spacing: -0.5px;">Soul Indica</div>
          <div style="font-size: 13px; color: rgba(255,255,255,0.85); margin-top: 4px;">Novo resgate de cupom</div>
        </div>
        <div style="background: #fff; border: 1px solid #E5E7EB; border-top: none; border-radius: 0 0 12px 12px; padding: 28px 32px;">
          <p style="margin: 0 0 20px; font-size: 15px; color: #374151;">
            Um atleta acabou de resgatar um benefício na plataforma Soul Indica.
          </p>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 10px 14px; background: #F9FAFB; border: 1px solid #E5E7EB; font-weight: 600; color: #6B7280; width: 40%;">Atleta (e-mail)</td>
              <td style="padding: 10px 14px; border: 1px solid #E5E7EB; color: #111827;">${atleta_email}</td>
            </tr>
            <tr>
              <td style="padding: 10px 14px; background: #F9FAFB; border: 1px solid #E5E7EB; font-weight: 600; color: #6B7280;">Parceiro</td>
              <td style="padding: 10px 14px; border: 1px solid #E5E7EB; color: #111827;">${parceiro_nome}</td>
            </tr>
            <tr>
              <td style="padding: 10px 14px; background: #F9FAFB; border: 1px solid #E5E7EB; font-weight: 600; color: #6B7280;">Categoria</td>
              <td style="padding: 10px 14px; border: 1px solid #E5E7EB; color: #111827;">${parceiro_categoria ?? '—'}</td>
            </tr>
            <tr>
              <td style="padding: 10px 14px; background: #F9FAFB; border: 1px solid #E5E7EB; font-weight: 600; color: #6B7280;">Data/hora</td>
              <td style="padding: 10px 14px; border: 1px solid #E5E7EB; color: #111827;">${dataFormatada}</td>
            </tr>
            <tr>
              <td style="padding: 10px 14px; background: #F9FAFB; border: 1px solid #E5E7EB; font-weight: 600; color: #6B7280;">Cupom gerado</td>
              <td style="padding: 10px 14px; border: 1px solid #E5E7EB;">
                <span style="font-size: 18px; font-weight: 900; color: #00A87C; letter-spacing: 3px;">${codigo}</span>
              </td>
            </tr>
          </table>
          <div style="margin-top: 24px; padding: 14px 16px; background: #FFFBEB; border: 1px solid #FDE68A; border-radius: 8px; font-size: 13px; color: #92400E;">
            Lembre-se de enviar o link de agendamento do parceiro para o atleta assim que possível.
          </div>
        </div>
      </div>
    `;

    const res = await fetch('https://api.zeptomail.com/v1.1/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': ZEPTO_API_KEY,
      },
      body: JSON.stringify({
        from: { address: 'contato@soulbrasil.co', name: 'Soul Indica' },
        to: [
          { email_address: { address: 'contato@soulbrasil.co', name: 'Soul' } },
          { email_address: { address: 'ana@soulbrasil.co', name: 'Ana' } },
        ],
        subject: `[Soul Indica] Novo resgate — ${parceiro_nome} | ${atleta_email}`,
        htmlbody: html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`ZeptoMail error: ${err}`);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
