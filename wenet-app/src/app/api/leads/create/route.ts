import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // Twój alias @ kieruje pewnie do src/

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { companyId, contactName, email, phone } = body;

    // Walidacja podstawowa
    if (!companyId || !email || !phone) {
      return NextResponse.json(
        { error: "Wymagane pola: companyId, email, phone" },
        { status: 400 }
      );
    }

    // Zapis do bazy
    const lead = await prisma.lead.create({
      data: {
        companyId,
        contactName: contactName || "Nie podano",
        email,
        phone,
        status: "NEW", // Domyślny status
      },
    });

    return NextResponse.json(
      { success: true, leadId: lead.id },
      { status: 201 }
    );
  } catch (error) {
    console.error("Błąd zapisu leada:", error);
    return NextResponse.json(
      { error: "Wystąpił błąd serwera podczas zapisywania zgłoszenia." },
      { status: 500 }
    );
  }
}
