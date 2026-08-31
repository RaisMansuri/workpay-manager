const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function formatE164(phone: string): string {
  if (!phone) return "";

  const clean = String(phone).replace(/\D/g, "");

  // Indian 10 digit number
  if (clean.length === 10) {
    return `+91${clean}`;
  }

  // Already Indian number without +
  if (clean.length === 12 && clean.startsWith("91")) {
    return `+${clean}`;
  }

  return `+${clean}`;
}

Deno.serve(async (req: Request) => {

  // CORS PREFLIGHT
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: corsHeaders,
    });
  }

  // Only POST allowed
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Method not allowed",
      }),
      {
        status: 405,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }

  try {
    const body = await req.json();

    const {
      mobile_number,
      customer_name,
      service_type,
      total_amount,
      paid_amount,
      remaining_balance,
    } = body;

    if (!mobile_number) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Mobile number is required",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const recipient = formatE164(mobile_number);

    const message = `Hello ${customer_name},

Your ${service_type} service request has been registered successfully.

Total Amount: Rs. ${total_amount}
Paid Amount: Rs. ${paid_amount}
Remaining Balance: Rs. ${remaining_balance}

Thank you for visiting our Kendra.`;

    // SECURE SUPABASE SECRETS
    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const fromNumber = Deno.env.get("TWILIO_PHONE_NUMBER");

    if (!accountSid || !authToken || !fromNumber) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Twilio credentials are not configured",
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const credentials = btoa(
      `${accountSid}:${authToken}`
    );

    const formData = new URLSearchParams();

    formData.append("To", recipient);
    formData.append("From", fromNumber);
    formData.append("Body", message);

    const twilioResponse = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",

        headers: {
          "Authorization": `Basic ${credentials}`,
          "Content-Type":
            "application/x-www-form-urlencoded",
        },

        body: formData,
      }
    );

    const result = await twilioResponse.json();

    if (!twilioResponse.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          error: result.message,
          code: result.code,
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "SMS sent successfully",
        sid: result.sid,
        recipient,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );

  } catch (error) {

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});