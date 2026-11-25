package pe.contabilidad.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;
import org.springframework.security.web.csrf.CsrfTokenRequestHandler;
import org.springframework.security.web.csrf.XorCsrfTokenRequestAttributeHandler;
import org.springframework.util.StringUtils;

import java.util.function.Supplier;

/**
 * Manejo de CSRF para una aplicación de una sola página (SPA): la SPA lee el token de la cookie
 * XSRF-TOKEN y lo envía en la cabecera X-XSRF-TOKEN. Se mantiene la protección BREACH
 * para el token renderizado en respuestas.
 */
public final class SpaCsrfTokenRequestHandler implements CsrfTokenRequestHandler {

    private final CsrfTokenRequestHandler plano = new CsrfTokenRequestAttributeHandler();
    private final CsrfTokenRequestHandler xor = new XorCsrfTokenRequestAttributeHandler();

    @Override
    public void handle(HttpServletRequest request, HttpServletResponse response, Supplier<CsrfToken> csrfToken) {
        xor.handle(request, response, csrfToken);
        csrfToken.get(); // fuerza la emisión de la cookie
    }

    @Override
    public String resolveCsrfTokenValue(HttpServletRequest request, CsrfToken csrfToken) {
        String cabecera = request.getHeader(csrfToken.getHeaderName());
        return (StringUtils.hasText(cabecera) ? plano : xor).resolveCsrfTokenValue(request, csrfToken);
    }
}
