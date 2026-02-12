# Backend Implementation: Elevator QR Code Generation

## 1. Dependencies (pom.xml)

```xml
<!-- ZXing for QR code generation -->
<dependency>
    <groupId>com.google.zxing</groupId>
    <artifactId>core</artifactId>
    <version>3.5.2</version>
</dependency>
<dependency>
    <groupId>com.google.zxing</groupId>
    <artifactId>javase</artifactId>
    <version>3.5.2</version>
</dependency>

<!-- For PDF generation (optional) -->
<dependency>
    <groupId>com.itextpdf</groupId>
    <artifactId>itext7-core</artifactId>
    <version>8.0.2</version>
    <type>pom</type>
</dependency>
```

## 2. QR Signature Service

```java
package com.saraasansor.api.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.util.Base64;

@Service
public class ElevatorQRSignatureService {
    
    @Value("${app.qr.elevator-secret:your-elevator-qr-secret-key-min-32-chars}")
    private String elevatorQRSecret;
    
    private static final String HMAC_ALGORITHM = "HmacSHA256";
    
    /**
     * Generate HMAC signature for elevator QR URL
     * 
     * @param elevatorId Elevator ID
     * @return Base64 encoded HMAC signature
     */
    public String generateSignature(Long elevatorId) {
        try {
            String message = "e=" + elevatorId;
            Mac mac = Mac.getInstance(HMAC_ALGORITHM);
            SecretKeySpec secretKeySpec = new SecretKeySpec(
                elevatorQRSecret.getBytes(StandardCharsets.UTF_8),
                HMAC_ALGORITHM
            );
            mac.init(secretKeySpec);
            byte[] hash = mac.doFinal(message.getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(hash);
        } catch (NoSuchAlgorithmException | InvalidKeyException e) {
            throw new RuntimeException("Failed to generate QR signature", e);
        }
    }
    
    /**
     * Validate HMAC signature
     * 
     * @param elevatorId Elevator ID
     * @param signature Signature to validate
     * @return true if signature is valid
     */
    public boolean validateSignature(Long elevatorId, String signature) {
        String expectedSignature = generateSignature(elevatorId);
        return expectedSignature.equals(signature);
    }
    
    /**
     * Generate QR URL for elevator
     * 
     * @param elevatorId Elevator ID
     * @return Complete QR URL with signature
     */
    public String generateQRURL(Long elevatorId) {
        String signature = generateSignature(elevatorId);
        return String.format("https://app.saraasansor.com/qr-start?e=%d&s=%s", 
            elevatorId, signature);
    }
}
```

## 3. QR Code Generator Service

```java
package com.saraasansor.api.service;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.EncodeHintType;
import com.google.zxing.WriterException;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import com.google.zxing.qrcode.decoder.ErrorCorrectionLevel;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

@Service
public class ElevatorQRGeneratorService {
    
    @Autowired
    private ElevatorQRSignatureService signatureService;
    
    private static final int QR_SIZE = 300; // 300x300 pixels
    private static final int QR_MARGIN = 1;
    
    /**
     * Generate QR code image as PNG byte array
     * 
     * @param elevatorId Elevator ID
     * @return PNG image as byte array
     */
    public byte[] generateQRCodeImage(Long elevatorId) throws WriterException, IOException {
        String qrURL = signatureService.generateQRURL(elevatorId);
        
        // QR code writer
        QRCodeWriter qrCodeWriter = new QRCodeWriter();
        Map<EncodeHintType, Object> hints = new HashMap<>();
        hints.put(EncodeHintType.ERROR_CORRECTION, ErrorCorrectionLevel.H);
        hints.put(EncodeHintType.MARGIN, QR_MARGIN);
        hints.put(EncodeHintType.CHARACTER_SET, "UTF-8");
        
        // Generate bit matrix
        BitMatrix bitMatrix = qrCodeWriter.encode(
            qrURL,
            BarcodeFormat.QR_CODE,
            QR_SIZE,
            QR_SIZE,
            hints
        );
        
        // Convert to image
        int width = bitMatrix.getWidth();
        int height = bitMatrix.getHeight();
        BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        
        for (int x = 0; x < width; x++) {
            for (int y = 0; y < height; y++) {
                image.setRGB(x, y, bitMatrix.get(x, y) ? 0x000000 : 0xFFFFFF);
            }
        }
        
        // Convert to PNG
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        ImageIO.write(image, "PNG", baos);
        return baos.toByteArray();
    }
    
    /**
     * Generate QR code with custom size
     * 
     * @param elevatorId Elevator ID
     * @param size QR code size in pixels
     * @return PNG image as byte array
     */
    public byte[] generateQRCodeImage(Long elevatorId, int size) throws WriterException, IOException {
        String qrURL = signatureService.generateQRURL(elevatorId);
        
        QRCodeWriter qrCodeWriter = new QRCodeWriter();
        Map<EncodeHintType, Object> hints = new HashMap<>();
        hints.put(EncodeHintType.ERROR_CORRECTION, ErrorCorrectionLevel.H);
        hints.put(EncodeHintType.MARGIN, QR_MARGIN);
        hints.put(EncodeHintType.CHARACTER_SET, "UTF-8");
        
        BitMatrix bitMatrix = qrCodeWriter.encode(
            qrURL,
            BarcodeFormat.QR_CODE,
            size,
            size,
            hints
        );
        
        int width = bitMatrix.getWidth();
        int height = bitMatrix.getHeight();
        BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        
        for (int x = 0; x < width; x++) {
            for (int y = 0; y < height; y++) {
                image.setRGB(x, y, bitMatrix.get(x, y) ? 0x000000 : 0xFFFFFF);
            }
        }
        
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        ImageIO.write(image, "PNG", baos);
        return baos.toByteArray();
    }
}
```

## 4. PDF Generator Service (Optional)

```java
package com.saraasansor.api.service;

import com.itextpdf.io.image.ImageDataFactory;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Image;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Text;
import com.itextpdf.layout.property.TextAlignment;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;

@Service
public class ElevatorQRPDFService {
    
    @Autowired
    private ElevatorQRGeneratorService qrGeneratorService;
    
    @Autowired
    private ElevatorQRSignatureService signatureService;
    
    /**
     * Generate PDF with QR code, logo, and instructions
     * 
     * @param elevatorId Elevator ID
     * @param elevatorName Elevator name/identifier
     * @param companyLogoPath Path to company logo (optional)
     * @return PDF as byte array
     */
    public byte[] generateQRPDF(
            Long elevatorId,
            String elevatorName,
            String companyLogoPath) throws IOException, WriterException {
        
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        PdfWriter writer = new PdfWriter(baos);
        PdfDocument pdf = new PdfDocument(writer);
        Document document = new Document(pdf);
        
        // Add logo if available
        if (companyLogoPath != null && !companyLogoPath.isEmpty()) {
            try {
                ClassPathResource logoResource = new ClassPathResource(companyLogoPath);
                if (logoResource.exists()) {
                    Image logo = new Image(ImageDataFactory.create(logoResource.getURL()));
                    logo.setWidth(100);
                    logo.setHorizontalAlignment(com.itextpdf.layout.property.HorizontalAlignment.CENTER);
                    document.add(logo);
                    document.add(new Paragraph("\n"));
                }
            } catch (Exception e) {
                // Logo not found, continue without it
            }
        }
        
        // Title
        Paragraph title = new Paragraph("Asansör QR Kodu")
            .setFontSize(20)
            .setBold()
            .setTextAlignment(TextAlignment.CENTER);
        document.add(title);
        document.add(new Paragraph("\n"));
        
        // Elevator name
        Paragraph elevatorInfo = new Paragraph(elevatorName)
            .setFontSize(14)
            .setTextAlignment(TextAlignment.CENTER);
        document.add(elevatorInfo);
        document.add(new Paragraph("\n"));
        
        // QR code image
        byte[] qrImageBytes = qrGeneratorService.generateQRCodeImage(elevatorId, 200);
        Image qrImage = new Image(ImageDataFactory.create(qrImageBytes));
        qrImage.setHorizontalAlignment(com.itextpdf.layout.property.HorizontalAlignment.CENTER);
        document.add(qrImage);
        document.add(new Paragraph("\n"));
        
        // Instructions
        Paragraph instructions = new Paragraph(
            "Bu QR kodu tarayarak bakım işlemlerini başlatabilirsiniz.\n" +
            "QR kodunu mobil cihazınızın kamerası ile tarayın."
        )
            .setFontSize(10)
            .setTextAlignment(TextAlignment.CENTER)
            .setItalic();
        document.add(instructions);
        
        document.close();
        return baos.toByteArray();
    }
}
```

## 5. Elevator QR Controller

```java
package com.saraasansor.api.controller;

import com.saraasansor.api.model.Elevator;
import com.saraasansor.api.repository.ElevatorRepository;
import com.saraasansor.api.service.ElevatorQRGeneratorService;
import com.saraasansor.api.service.ElevatorQRPDFService;
import com.saraasansor.api.service.ElevatorQRSignatureService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.io.WriterException;

@RestController
@RequestMapping("/api/elevators")
@CrossOrigin(origins = "*")
public class ElevatorQRController {
    
    @Autowired
    private ElevatorRepository elevatorRepository;
    
    @Autowired
    private ElevatorQRGeneratorService qrGeneratorService;
    
    @Autowired
    private ElevatorQRPDFService qrPDFService;
    
    @Autowired
    private ElevatorQRSignatureService signatureService;
    
    /**
     * Get QR code image as PNG
     * GET /api/elevators/{id}/qr
     */
    @GetMapping("/{id}/qr")
    @PreAuthorize("hasAnyRole('PATRON', 'PERSONEL', 'ADMIN')")
    public ResponseEntity<byte[]> getElevatorQRCode(@PathVariable Long id) {
        Elevator elevator = elevatorRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND,
                "Elevator not found"
            ));
        
        try {
            byte[] qrImage = qrGeneratorService.generateQRCodeImage(id);
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.IMAGE_PNG);
            headers.setContentDispositionFormData("attachment", 
                "elevator-" + id + "-qr.png");
            
            return ResponseEntity.ok()
                .headers(headers)
                .body(qrImage);
        } catch (WriterException | IOException e) {
            throw new ResponseStatusException(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "Failed to generate QR code"
            );
        }
    }
    
    /**
     * Get QR code as PDF
     * GET /api/elevators/{id}/qr/pdf
     */
    @GetMapping("/{id}/qr/pdf")
    @PreAuthorize("hasAnyRole('PATRON', 'PERSONEL', 'ADMIN')")
    public ResponseEntity<byte[]> getElevatorQRCodePDF(
            @PathVariable Long id,
            @RequestParam(required = false) String logoPath) {
        
        Elevator elevator = elevatorRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND,
                "Elevator not found"
            ));
        
        try {
            String elevatorName = elevator.getBina() + " - " + elevator.getKimlikNo();
            byte[] pdfBytes = qrPDFService.generateQRPDF(
                id,
                elevatorName,
                logoPath
            );
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDispositionFormData("attachment",
                "elevator-" + id + "-qr.pdf");
            
            return ResponseEntity.ok()
                .headers(headers)
                .body(pdfBytes);
        } catch (IOException | WriterException e) {
            throw new ResponseStatusException(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "Failed to generate QR PDF"
            );
        }
    }
    
    /**
     * Get QR URL (for frontend display)
     * GET /api/elevators/{id}/qr-url
     */
    @GetMapping("/{id}/qr-url")
    @PreAuthorize("hasAnyRole('PATRON', 'PERSONEL', 'ADMIN')")
    public ResponseEntity<Map<String, String>> getElevatorQRURL(@PathVariable Long id) {
        Elevator elevator = elevatorRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND,
                "Elevator not found"
            ));
        
        String qrURL = signatureService.generateQRURL(id);
        
        return ResponseEntity.ok(Map.of("qrURL", qrURL));
    }
}
```

## 6. QR Validation Endpoint (for scanning)

```java
@GetMapping("/qr-start")
public ResponseEntity<Map<String, Object>> validateQRStart(
        @RequestParam Long e, // elevatorId
        @RequestParam String s) { // signature
        
    // Validate signature
    if (!signatureService.validateSignature(e, s)) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
            .body(Map.of("valid", false, "error", "Invalid signature"));
    }
    
    // Load elevator
    Elevator elevator = elevatorRepository.findById(e)
        .orElse(null);
    
    if (elevator == null) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
            .body(Map.of("valid", false, "error", "Elevator not found"));
    }
    
    return ResponseEntity.ok(Map.of(
        "valid", true,
        "elevatorId", e,
        "elevatorName", elevator.getBina() + " - " + elevator.getKimlikNo()
    ));
}
```

## 7. Application Properties

```properties
# Elevator QR Configuration
app.qr.elevator-secret=your-very-secure-secret-key-minimum-32-characters-long-change-in-production
```

## 8. Security Notes

1. **HMAC Secret**: Must be at least 32 characters. Store in environment variables.
2. **URL Format**: `https://app.saraasansor.com/qr-start?e={elevatorId}&s={signature}`
3. **Signature Validation**: Always validate signature on QR scan endpoint.
4. **Static QR**: QR code is static per elevator (doesn't expire).
5. **Base64 URL Encoding**: Signature uses URL-safe Base64 encoding.
